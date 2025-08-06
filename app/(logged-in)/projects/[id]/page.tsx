'use client';

import { notFound, redirect, useRouter } from 'next/navigation';
import { use, useEffect } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { useChatSessions } from '@/hooks/use-chat-sessions';
import { useProject } from '@/hooks/use-projects';
import { useUser } from '@clerk/nextjs';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

function ProjectRedirectLoadingSkeleton() {
  return (
    <div className="flex flex-col h-screen w-full items-center justify-center">
      <div className="text-center space-y-4">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-2 w-64 mx-auto" />
        <p className="text-sm text-muted-foreground">Redirecting to chat session...</p>
      </div>
    </div>
  );
}

export default function ProjectPage({ params }: ProjectPageProps) {
  // Unwrap promises using React.use()
  const { id } = use(params);
  const router = useRouter();

  const projectId = Number(id);

  if (isNaN(projectId)) {
    notFound();
  }

  const { user } = useUser();
  const { data: project, isLoading: isProjectLoading, error: projectError } = useProject(projectId);
  const { data: sessions = [], isLoading: isSessionsLoading } = useChatSessions(projectId);

  // Auto-redirect to default session when sessions are loaded
  useEffect(() => {
    if (!isSessionsLoading && sessions.length > 0 && user && project) {
      // Find default session or use the first session
      const defaultSession = sessions.find(session => session.isDefault) || sessions[0];
      if (defaultSession) {
        console.log(`[ProjectPage] Redirecting to default session: ${defaultSession.sessionId}`);
        router.replace(`/projects/${projectId}/chat/${defaultSession.sessionId}`);
      }
    }
  }, [sessions, isSessionsLoading, user, project, router, projectId]);

  // Loading state
  if (isProjectLoading || isSessionsLoading || !user) {
    return <ProjectRedirectLoadingSkeleton />;
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

  // If no sessions exist, this is an edge case - show loading while sessions are created
  if (sessions.length === 0) {
    return <ProjectRedirectLoadingSkeleton />;
  }

  // This component should only briefly show while redirecting
  return <ProjectRedirectLoadingSkeleton />;
}
