import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '@/lib/db/drizzle';
import { chatMessages, actions, Action } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

import ProjectContent from '@/app/(logged-in)/projects/[id]/components/layout/project-content';
import { auth } from '@clerk/nextjs';
import { getProjectById } from '@/lib/db/projects';
import { Skeleton } from '@/components/ui/skeleton';

function ProjectLoadingSkeleton() {
  return (
    <div className="w-full h-screen p-0 m-0">
      <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        {/* Left Panel Skeleton - Chat Interface */}
        <div className="h-full overflow-hidden flex flex-col w-full md:w-1/3 lg:w-1/4 p-4 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <div className="flex-1 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Panel Skeleton - Preview/Code Explorer */}
        <div className="hidden md:flex md:w-2/3 lg:w-3/4 h-full flex-col overflow-hidden border border-border rounded-md">
          <div className="flex items-center justify-between p-4 border-b">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-2 w-64 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Update FetchedChatMessage type to include actions
interface FetchedChatMessage {
  id: number; // Assuming ID is always present after fetch
  content?: string;
  role?: 'user' | 'assistant' | 'system';
  timestamp?: string | Date;
  // Add actions property (optional)
  actions?: Action[]; // Use the Action type from schema
}

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Rewritten function to fetch messages and actions
async function fetchChatHistoryForProject(projectId: number): Promise<FetchedChatMessage[]> {
  console.log(`Fetching chat history with actions for project ${projectId}`);
  
  // 1. Fetch chat history, oldest first
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.projectId, projectId))
    .orderBy(chatMessages.timestamp); // Ascending order

  // 2. Extract assistant message IDs
  const assistantMessageIds = history
    .filter(msg => msg.role === 'assistant')
    .map(msg => msg.id);

  // 3. Fetch actions for these messages if any exist
  let fetchedActions: Action[] = [];
  if (assistantMessageIds.length > 0) {
    fetchedActions = await db
      .select()
      .from(actions)
      .where(inArray(actions.messageId, assistantMessageIds));
    console.log(`Fetched ${fetchedActions.length} actions for ${assistantMessageIds.length} assistant messages.`);
  }

  // 4. Group actions by message ID
  const actionsByMessageId = fetchedActions.reduce<Record<number, Action[]>>((acc, action) => {
    if (!acc[action.messageId]) {
      acc[action.messageId] = [];
    }
    acc[action.messageId].push(action);
    return acc;
  }, {});

  // 5. Combine messages with their actions
  const messagesWithActions = history.map(msg => ({
    ...msg,
    // Ensure timestamp is a Date object if needed downstream, though initial fetch might be string
    timestamp: msg.timestamp, 
    // Attach actions, default to empty array if none
    actions: actionsByMessageId[msg.id] || [],
  }));

  // Return the combined data, matching the FetchedChatMessage structure
  // Note: Ensure the selected fields from `history` match FetchedChatMessage
  return messagesWithActions.map(msg => ({
    id: msg.id,
    content: msg.content,
    role: msg.role as 'user' | 'assistant' | 'system', // Type assertion might be needed
    timestamp: msg.timestamp,
    actions: msg.actions,
    // Add other fields from FetchedChatMessage if they exist in chatMessages table
    // tokensInput: msg.tokensInput, 
    // tokensOutput: msg.tokensOutput,
    // contextTokens: msg.contextTokens,
    // metadata: msg.metadata,
  }));
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const session = await getSession();
  
  if (!session) {
    // Session check might be redundant if layout handles it, but keep for safety
    notFound(); 
  }
  
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    notFound();
  }
  
  // Fetch project details and initial chat messages (now with actions)
  const [project, initialMessagesResult] = await Promise.all([
    getProjectById(projectId),
    fetchChatHistoryForProject(projectId) // This now fetches actions too
  ]);
  
  if (!project || project.createdBy !== session.user.id) {
    notFound();
  }
  
  // Process fetched messages (adjust id/timestamp types if needed)
  const initialMessages = initialMessagesResult.map(msg => ({
    id: typeof msg.id === 'string' ? parseInt(msg.id, 10) : msg.id, // Ensure ID is number
    content: msg.content || '',
    role: msg.role || 'user',
    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(), // Ensure timestamp is Date
    actions: msg.actions?.map(action => ({ // Ensure action timestamps are Dates
      ...action,
      timestamp: action.timestamp ? new Date(action.timestamp) : new Date(),
    })) || [],
  }));

  // Removed user details fetching and mapping
  
  // Check if this is a new project (via query param)
  const searchParamsData = await searchParams;
  const isNewProject = searchParamsData.new === 'true';
  
  // Format dates for the project
  const formattedProject = {
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
  
  return (
    <Suspense fallback={<ProjectLoadingSkeleton />}>
      {/* Removed wrapper div, layout handles the main structure */}
      <ProjectContent 
        projectId={projectId}
        project={formattedProject}
        // Removed user prop
        isNewProject={isNewProject}
        initialMessages={initialMessages} // Pass messages with actions
      />
    </Suspense>
  );
} 