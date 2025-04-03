import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import ProjectContent from '@/app/(logged-in)/projects/[id]/components/project-content';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getProjectById } from '@/lib/db/projects';
import { users } from '@/lib/db/schema';
import { Skeleton } from '@/components/ui/skeleton';

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

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const session = await getSession();
  
  if (!session) {
    notFound();
  }
  
  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    notFound();
  }
  
  const project = await getProjectById(projectId);
  
  if (!project || project.createdBy !== session.user.id) {
    notFound();
  }
  
  // Get user details for the navbar
  const [userDetails] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  
  if (!userDetails) {
    notFound();
  }
  
  // Map user details to match the expected type
  const userForNavbar = {
    id: userDetails.id,
    name: userDetails.name || undefined,
    email: userDetails.email,
    imageUrl: userDetails.imageUrl || undefined
  };
  
  // Check if this is a new project (via query param)
  const searchParamsData = await searchParams;
  const isNewProject = searchParamsData.new === 'true';
  
  // Format dates for the project
  const formattedProject = {
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
  
  return (
    <Suspense fallback={<ProjectLoadingSkeleton />}>
      <div className="w-full h-screen p-0 m-0">
        <ProjectContent 
          projectId={projectId}
          project={formattedProject}
          user={userForNavbar}
          isNewProject={isNewProject}
        />
      </div>
    </Suspense>
  );
} 