import { auth } from '@/lib/auth/server';
import { getProjectsByUserId } from '@/lib/db/projects';
import type { Project } from '@/lib/stores/projectStore';

/**
 * Internal API function to get projects for the current user
 * This can be used in server components and API routes
 */
export async function getCurrentUserProjects(): Promise<Project[]> {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  return await getProjectsByUserId(userId);
}