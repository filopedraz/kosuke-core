'use client';

import ProjectsClient from '@/app/(logged-in)/projects/components/projects-client';
import { ProjectsLoadingSkeleton } from '@/app/(logged-in)/projects/components/projects-loading-skeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useProjects } from '@/hooks/use-projects';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function ProjectsPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: projects, isLoading: isProjectsLoading } = useProjects({
    userId: clerkUser?.id || '',
    initialData: []
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !clerkUser) {
      redirect('/sign-in');
    }
  }, [isLoaded, clerkUser]);

  // Show loading skeleton
  if (!isLoaded || isUserLoading || isProjectsLoading || !clerkUser || !user) {
    return <ProjectsLoadingSkeleton />;
  }

  return <ProjectsClient projects={projects || []} userId={user.clerkUserId} />;
}
