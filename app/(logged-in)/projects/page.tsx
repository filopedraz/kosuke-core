'use client';

import ProjectsClient from '@/app/(logged-in)/projects/components/projects-client';
import { ProjectsLoadingSkeleton } from '@/app/(logged-in)/projects/components/projects-loading-skeleton';
import { useUser } from '@/hooks/use-user';
import { useProjects } from '@/hooks/use-projects';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function ProjectsPage() {
  const { clerkUser, dbUser, isLoading } = useUser();
  const { data: projects, isLoading: isProjectsLoading } = useProjects({
    userId: clerkUser?.id || '',
    initialData: []
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !clerkUser) {
      redirect('/sign-in');
    }
  }, [isLoading, clerkUser]);

  // Show loading skeleton
  if (isLoading || isProjectsLoading || !clerkUser || !dbUser) {
    return <ProjectsLoadingSkeleton />;
  }

  return <ProjectsClient projects={projects || []} userId={dbUser.clerkUserId} />;
}
