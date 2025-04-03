'use client';

import { Project, useProjectStore } from '@/lib/stores/projectStore';
import { useProjects } from '@/lib/hooks/useProjects';
import ProjectCard from './ProjectCard';
import { ProjectCardSkeleton } from './loading';

interface ProjectGridProps {
  userId: number;
  initialProjects: Project[];
}

export default function ProjectGrid({ userId, initialProjects }: ProjectGridProps) {
  const { projects } = useProjectStore();
  const { isLoading, isFetching } = useProjects({
    userId,
    initialData: initialProjects,
  });

  // Show skeleton during initial load or subsequent fetches
  if (isLoading || isFetching) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
