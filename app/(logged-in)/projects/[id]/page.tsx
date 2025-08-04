'use client';

import { notFound } from 'next/navigation';
import { use, useEffect, useRef } from 'react';

import Navbar from '@/components/ui/navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { usePreviewStatus, useStartPreview } from '@/hooks/use-preview-status';
import { useProjectUIState } from '@/hooks/use-project-ui-state';
import { useProject } from '@/hooks/use-projects';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

// Import components
import BrandGuidelines from './components/brand/brand-guidelines';
import ChatInterface from './components/chat/chat-interface';
import CodeExplorer from './components/preview/code-explorer';
import PreviewPanel from './components/preview/preview-panel';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

function ProjectLoadingSkeleton() {
  return (
    <div className="flex flex-col h-screen w-full">
      {/* Navbar Skeleton */}
      <div className="w-full">
        <header className="w-full h-14 flex items-center bg-background">
          <div className="flex w-full h-full">
            {/* Left section - matches chat width */}
            <div className="flex items-center h-full w-full md:w-1/3 lg:w-1/4 border-r border-transparent relative">
              <div className="px-4 flex items-center">
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              {/* Toggle button skeleton */}
              <div className="absolute right-0 mr-2">
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>

            {/* Right section - project title and controls */}
            <div className="flex-1 flex items-center justify-between">
              <Skeleton className="h-5 w-32 ml-4" />

              <div className="flex items-center gap-2 mx-auto">
                <div className="flex border border-input rounded-md overflow-hidden">
                  <Skeleton className="h-8 w-20 rounded-none" />
                  <Skeleton className="h-8 w-16 rounded-none" />
                  <Skeleton className="h-8 w-20 rounded-none" />
                </div>
              </div>

              <div className="flex items-center gap-2 px-4">
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Content Skeleton */}
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

export default function ProjectPage({ params }: ProjectPageProps) {
  // Unwrap promises using React.use()
  const { id } = use(params);

  const projectId = Number(id);

  if (isNaN(projectId)) {
    notFound();
  }

  const { user } = useUser();
  const { data: project, isLoading: isProjectLoading, error: projectError } = useProject(projectId);
  const { data: messagesData, isLoading: isMessagesLoading } = useChatMessages(projectId, [], false);

  // UI state management
  const { currentView, setCurrentView, isChatCollapsed, toggleChatCollapsed } = useProjectUIState(project);

  // Preview management hooks
  const { data: previewStatus, isLoading: isPreviewLoading } = usePreviewStatus(projectId, false); // Disable polling initially
  const { mutateAsync: startPreview } = useStartPreview(projectId);

  // Reference to the ChatInterface component to maintain its state
  const chatInterfaceRef = useRef<HTMLDivElement>(null);
  // Track if we've already attempted to start preview for this project
  const previewStartAttempted = useRef<Set<number>>(new Set());

  // Automatically start preview if not running (only once per project)
  useEffect(() => {
    if (!isPreviewLoading && previewStatus && !previewStatus.url) {
      if (!previewStartAttempted.current.has(projectId)) {
        previewStartAttempted.current.add(projectId);
        console.log(`[ProjectPage] No preview URL found, starting preview for project ${projectId}`);
        startPreview().catch((error) => {
          console.error(`[ProjectPage] Error starting preview for project ${projectId}:`, error);
        });
      }
    } else if (previewStatus?.url) {
      console.log(`[ProjectPage] Preview already running for project ${projectId}:`, previewStatus.url);
    }
  }, [projectId, previewStatus, isPreviewLoading, startPreview]);

  // Loading state
  if (isProjectLoading || isMessagesLoading || !user) {
    return <ProjectLoadingSkeleton />;
  }

  // Error handling
  if (projectError || !project) {
    notFound();
  }

  // Access control - check project ownership
  if (project.createdBy !== user.id) {
    console.error('Access denied: User does not own this project');
    notFound();
  }

  // Process messages from the hook
  const initialMessages = messagesData?.messages || [];

  // Handlers
  const handleRefresh = () => {
    // Refresh could trigger a page reload or refetch project data
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-screen w-full">
      <Navbar
        variant="project"
        projectProps={{
          projectName: project?.name || 'Loading Project...',
          currentView: currentView,
          onViewChange: setCurrentView,
          onRefresh: handleRefresh,
          isChatCollapsed: isChatCollapsed,
          onToggleChat: toggleChatCollapsed,
        }}
      />
      <div className={cn('flex h-[calc(100vh-3.5rem)] w-full overflow-hidden')}>
        <div
          ref={chatInterfaceRef}
          className={cn(
            "h-full overflow-hidden flex flex-col",
            // Remove transition effects that cause messages to appear gradually
            isChatCollapsed ? "w-0 opacity-0" : "w-full md:w-1/3 lg:w-1/4"
          )}
          style={{
            // Use visibility instead of conditional rendering
            visibility: isChatCollapsed ? 'hidden' : 'visible',
            // Use display to properly hide when collapsed
            display: isChatCollapsed ? 'none' : 'flex'
          }}
        >
          {/* Always render the ChatInterface but hide it with CSS */}
          <ChatInterface
            projectId={projectId}
            initialMessages={initialMessages}
            isLoading={false} // Explicitly set to false since we have initial data
          />
        </div>

        <div
          className={cn(
            "h-full flex-col overflow-hidden border rounded-md border-border",
            // Remove transitions from this element as well
            isChatCollapsed ? "w-full" : "hidden md:flex md:w-2/3 lg:w-3/4"
          )}
        >
          {currentView === 'preview' ? (
            <PreviewPanel
              projectId={projectId}
              projectName={project.name}
            />
          ) : currentView === 'code' ? (
            <CodeExplorer
              projectId={projectId}
            />
          ) : (
            <BrandGuidelines
              projectId={projectId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
