import { redirect } from 'next/navigation';

import ProjectsClient from '@/app/(logged-in)/projects/components/ProjectsClient';
import { getProjectsByUserId } from '@/lib/db/projects';
import { getUser } from '@/lib/db/queries';

export default async function ProjectsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get all projects for the user to pass as initial data
  const projects = await getProjectsByUserId(user.id);

  return <ProjectsClient projects={projects} userId={user.id} />;
} 