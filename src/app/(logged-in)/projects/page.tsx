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
    </div>
  );
}

export default function ProjectsPage() {
  const { clerkUser, dbUser, isLoading } = useUser();
  const { data: projects, isLoading: isProjectsLoading } = useProjects({
    userId: clerkUser?.id || '',
    initialData: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();


  // Only refetch projects if data is stale (don't force refetch on every mount)
  useEffect(() => {
    if (dbUser?.clerkUserId) {
      // Only invalidate if we don't have fresh data
      const queryState = queryClient.getQueryState(['projects', dbUser.clerkUserId]);
      const isStale = !queryState?.data || Date.now() - (queryState?.dataUpdatedAt || 0) > 60000; // 1 minute

      if (isStale) {
        queryClient.invalidateQueries({
          queryKey: ['projects', dbUser.clerkUserId],
          refetchType: 'active'
        });
      }
    }
  }, [queryClient, dbUser?.clerkUserId]);

  // Show loading skeleton only during initial load or when we don't have auth
  // Don't show skeleton during background refetches (isFetching) when we already have data
  if (isLoading || isProjectsLoading || !clerkUser || !dbUser || projects === undefined) {
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
