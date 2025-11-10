import { db } from '@/lib/db/drizzle';
import { organizations, projects } from '@/lib/db/schema';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq, isNull } from 'drizzle-orm';

/**
 * Get all organizations a user belongs to via Clerk API
 */
export async function getUserOrganizations(userId: string) {
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({ userId });

  // Fetch org details from our DB for cached data
  const orgIds = memberships.data.map(m => m.organization.id);
  if (orgIds.length === 0) return [];

  const orgs = await db.select().from(organizations).where(isNull(organizations.deletedAt));

  return memberships.data.map(m => ({
    organization: orgs.find(o => o.clerkOrgId === m.organization.id),
    membership: {
      role: m.role,
      clerkOrgId: m.organization.id,
      clerkUserId: userId,
    },
  }));
}

/**
 * Get user's personal organization
 */
export async function getPersonalOrganization(userId: string) {
  const orgs = await getUserOrganizations(userId);
  return orgs.find(o => o.organization?.isPersonal);
}

/**
 * Get active organization from Clerk session
 */
export async function getActiveOrganization() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, orgId))
    .limit(1);

  return org;
}

/**
 * Check if user is organization admin via Clerk API
 */
export async function isOrgAdmin(userId: string, orgId: string) {
  const clerk = await clerkClient();
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
  });

  const membership = memberships.data.find(m => m.publicUserData?.userId === userId);
  return membership?.role === 'org:admin';
}

/**
 * Get all projects belonging to an organization
 */
export async function getOrganizationProjects(orgId: string) {
  return await db.select().from(projects).where(eq(projects.clerkOrgId, orgId));
}

/**
 * Get all members of an organization via Clerk API
 */
export async function getOrganizationMembers(orgId: string) {
  const clerk = await clerkClient();
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
  });

  return memberships.data
    .filter(m => m.publicUserData != null)
    .map(m => ({
      clerkOrgId: m.organization.id,
      clerkUserId: m.publicUserData!.userId,
      role: m.role,
      email: m.publicUserData!.identifier,
      name: `${m.publicUserData!.firstName || ''} ${m.publicUserData!.lastName || ''}`.trim(),
      imageUrl: m.publicUserData!.imageUrl,
    }));
}
