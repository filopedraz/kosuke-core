import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { db } from '@/lib/db/drizzle';
import { organizations, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * DELETE /api/organizations/[orgId]
 *
 * Deletes an organization. Requires:
 * - User must be an admin
 * - Organization cannot be personal
 *
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId } = await params;

    // Check if user is admin of this org
    const clerk = await clerkClient();
    const memberships = await clerk.users.getOrganizationMembershipList({ userId });
    const membership = memberships.data.find(m => m.organization.id === orgId);

    if (!membership || membership.role !== 'org:admin') {
      return ApiErrorHandler.forbidden('Only admins can delete organizations');
    }

    // Check if org is personal (can't delete personal workspace)
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });
    if (org.publicMetadata?.isPersonal === true) {
      return ApiErrorHandler.badRequest('Cannot delete personal workspace');
    }

    // Delete organization via Clerk (this will also trigger webhook to clean up DB)
    await clerk.organizations.deleteOrganization(orgId);

    // Also clean up DB directly in case webhook fails
    await db.delete(projects).where(eq(projects.clerkOrgId, orgId));
    await db.delete(organizations).where(eq(organizations.clerkOrgId, orgId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return ApiErrorHandler.handle(error);
  }
}
