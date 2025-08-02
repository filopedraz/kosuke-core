import ProjectsClient from '@/app/(logged-in)/projects/components/projects-client';
import { getCurrentUser } from '@/lib/api/internal/user';
import { getCurrentUserProjects } from '@/lib/api/internal/projects';
import { redirect } from 'next/navigation';

export default async function ProjectsPage() {
  const user = await getCurrentUser();

  // User should always exist here due to middleware protection
  if (!user) {
    redirect('/sign-in');
  }

  // Get all projects for the user to pass as initial data
  const projects = await getCurrentUserProjects();

  return <ProjectsClient projects={projects} userId={user.clerkUserId} />;
}
