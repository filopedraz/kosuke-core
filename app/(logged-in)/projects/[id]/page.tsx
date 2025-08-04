'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';

import ProjectContent from '@/app/(logged-in)/projects/[id]/components/layout/project-content';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { useProject } from '@/hooks/use-projects';
import { useUser } from '@clerk/nextjs';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

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

  // Loading state
  if (isProjectLoading || isMessagesLoading || !user) {
    return <ProjectLoadingSkeleton />;
  }

  // Error handling
  if (projectError || !project) {
    notFound();
  }

  // Access control
  if (project.createdBy !== user.id) {
    notFound();
  }

  // Process messages from the hook
  const initialMessages = messagesData?.messages || [];

  return (
    <ProjectContent
      projectId={projectId}
      project={project}
      initialMessages={initialMessages}
    />
  );
}
