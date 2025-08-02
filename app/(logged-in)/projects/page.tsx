import ProjectsClient from '@/app/(logged-in)/projects/components/projects-client';
import { getProjectsByUserId } from '@/lib/db/projects';
import { getUser } from '@/lib/db/queries';

export default async function ProjectsPage() {
  const user = await getUser();

  // User should always exist here due to middleware protection
  if (!user) {
    throw new Error('User not found - this should not happen');
  }

  // Get all projects for the user to pass as initial data
  const projects = await getProjectsByUserId(user.clerkUserId);

  return <ProjectsClient projects={projects} userId={user.clerkUserId} />;
}
