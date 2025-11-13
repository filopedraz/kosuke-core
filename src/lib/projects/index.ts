/**
 * Project Access Control Utilities
 *
 * Verifies user access to projects based on organization membership
 */

import { clerkService } from '@/lib/clerk';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface ProjectAccessResult {
  hasAccess: boolean;
  project?: typeof projects.$inferSelect;
  isOrgAdmin?: boolean;
}

/**
 * Verify if a user has access to a project through organization membership
 *
 * @param userId - The Clerk user ID
 * @param projectId - The project ID to check
 * @returns Object containing access status and project data
 */
export async function verifyProjectAccess(
  userId: string,
  projectId: string
): Promise<ProjectAccessResult> {
  // Get the project
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project || !project.orgId) {
    return { hasAccess: false };
  }

  // Check if user is a member of the project's organization
  const memberships = await clerkService.getUserMemberships(userId);
  const membership = memberships.data.find(m => m.organization.id === project.orgId);

  if (!membership) {
    return { hasAccess: false, project };
  }

  // User has access - also check if they're an admin
  const isAdmin = membership.role === 'org:admin';

  return {
    hasAccess: true,
    project,
    isOrgAdmin: isAdmin,
  };
}

