'use client';

import EmptyState from '@/app/(logged-in)/projects/components/empty-state';
import ProjectCreationModal from '@/app/(logged-in)/projects/components/project-creation-modal';
import ProjectGrid from '@/app/(logged-in)/projects/components/project-grid';
import ProjectsHeader from '@/app/(logged-in)/projects/components/projects-header';
import { ProjectCardSkeleton, ProjectModalSkeleton } from '@/app/(logged-in)/projects/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks/use-projects';
import { useUser } from '@/hooks/use-user';
import { useQueryClient } from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ProjectsLoadingSkeleton() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}

    </div>
  );
}

export default function ProjectsPage() {
  const { clerkUser, dbUser, isLoading } = useUser();
  const { data: projects, isLoading: isProjectsLoading, isFetching: isProjectsFetching } = useProjects({
    userId: clerkUser?.id || '',
    initialData: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !clerkUser) {
      redirect('/sign-in');
    }
  }, [isLoading, clerkUser]);

  // Ensure project data is fresh when the page is visited
  useEffect(() => {
    if (dbUser?.clerkUserId) {
      // Refetch projects data when the component mounts
      queryClient.invalidateQueries({
        queryKey: ['projects', dbUser.clerkUserId],
        refetchType: 'active'
      });
    }
  }, [queryClient, dbUser?.clerkUserId]);

  // Show loading skeleton while:
  // 1. User auth is loading
  // 2. Projects are loading for the first time
  // 3. Projects are currently being fetched and we don't have data yet
  // 4. We don't have auth context yet
  if (isLoading || isProjectsLoading || isProjectsFetching || !clerkUser || !dbUser || projects === undefined) {
    return <ProjectsLoadingSkeleton />;
  }

  return (
    <>
      <div className="container mx-auto py-8">
        <ProjectsHeader
          hasProjects={(projects?.length ?? 0) > 0}
          onCreateClick={() => setIsModalOpen(true)}
        />

        <Suspense fallback={<ProjectsLoadingSkeleton />}>
          {!projects?.length ? (
            <EmptyState onCreateClick={() => setIsModalOpen(true)} />
          ) : (
            <ProjectGrid userId={dbUser.clerkUserId} initialProjects={projects} />
          )}
        </Suspense>
      </div>

      <Suspense fallback={<ProjectModalSkeleton />}>
        <ProjectCreationModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      </Suspense>
    </>
  );
}
