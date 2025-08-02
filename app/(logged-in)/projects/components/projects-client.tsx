'use client';

import ProjectCreationModal from '@/app/(logged-in)/projects/components/project-creation-modal';
import ProjectGrid from '@/app/(logged-in)/projects/components/project-grid';
import ProjectsHeader from '@/app/(logged-in)/projects/components/projects-header';
import { Project } from '@/lib/stores/projectStore';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useEffect, useState } from 'react';
import EmptyState from './empty-state';
import { ProjectModalSkeleton } from './project-modal-skeleton';
import { ProjectsLoadingSkeleton } from './projects-loading-skeleton';

interface ProjectsClientProps {
  projects: Project[];
  userId: string;
}

export default function ProjectsClient({ projects, userId }: ProjectsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Ensure project data is fresh when the page is visited
  useEffect(() => {
    // Refetch projects data when the component mounts
    queryClient.invalidateQueries({
      queryKey: ['projects', userId],
      refetchType: 'active'
    });
  }, [queryClient, userId]);

  return (
    <>
      <div className="container mx-auto py-8">
        <ProjectsHeader
          hasProjects={projects?.length > 0}
          onCreateClick={() => setIsModalOpen(true)}
        />

        <Suspense fallback={<ProjectsLoadingSkeleton />}>
          {!projects?.length ? (
            <EmptyState onCreateClick={() => setIsModalOpen(true)} />
          ) : (
            <ProjectGrid userId={userId} initialProjects={projects} />
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
