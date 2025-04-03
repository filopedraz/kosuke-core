'use client';

import { Suspense, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ProjectCreationModal from '@/app/(logged-in)/projects/components/ProjectCreationModal';
import ProjectGrid from '@/app/(logged-in)/projects/components/ProjectGrid';
import ProjectsHeader from '@/app/(logged-in)/projects/components/ProjectsHeader';
import EmptyState from './EmptyState';
import { ProjectsLoadingSkeleton } from './ProjectsLoadingSkeleton';
import { ProjectModalSkeleton } from './ProjectModalSkeleton';
import { Project } from '@/lib/stores/projectStore';

interface ProjectsClientProps {
  projects: Project[];
  userId: number;
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