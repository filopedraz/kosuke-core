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
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

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
    userId: dbUser?.clerkUserId ?? '',
    initialData: []
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'create' | 'import'>('create');
  const [showGitHubConnected, setShowGitHubConnected] = useState(false);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasProcessedRedirectRef = useRef(false);

  // Check for openImport parameter after GitHub OAuth redirect
  useEffect(() => {
    if (searchParams.get('openImport') === 'true' && !hasProcessedRedirectRef.current) {
      hasProcessedRedirectRef.current = true;

      setInitialTab('import');
      setIsModalOpen(true);
      setShowGitHubConnected(searchParams.get('githubConnected') === 'true');

      // Clean up URL without reloading the page
      const url = new URL(window.location.href);
      url.searchParams.delete('openImport');
      url.searchParams.delete('githubConnected');
      router.replace(url.pathname, { scroll: false });
    }
  }, [searchParams, router]);

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

  const handleOpenModal = () => {
    setInitialTab('create'); // Reset to create tab when manually opening
    setShowGitHubConnected(false); // Reset success message flag
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      // Reset to create tab when closing
      setInitialTab('create');
      setShowGitHubConnected(false);
    }
  };

  return (
    <>
      <div className="container mx-auto py-8">
        <ProjectsHeader
          hasProjects={(projects?.length ?? 0) > 0}
          onCreateClick={handleOpenModal}
        />

        <Suspense fallback={<ProjectsLoadingSkeleton />}>
          {!projects?.length ? (
            <EmptyState onCreateClick={handleOpenModal} />
          ) : (
            <ProjectGrid userId={dbUser.clerkUserId} initialProjects={projects} />
          )}
        </Suspense>
      </div>

      <Suspense fallback={<ProjectModalSkeleton />}>
        <ProjectCreationModal
          open={isModalOpen}
          onOpenChange={handleCloseModal}
          initialTab={initialTab}
          showGitHubConnected={showGitHubConnected}
        />
      </Suspense>
    </>
  );
}
