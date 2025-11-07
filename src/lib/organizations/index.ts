import { db } from '@/lib/db/drizzle';
import { organizationMemberships, organizations, projects } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(userId: string) {
  const memberships = await db
    .select({
      organization: organizations,
      membership: organizationMemberships,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.clerkOrgId, organizationMemberships.clerkOrgId))
    .where(and(eq(organizationMemberships.clerkUserId, userId), isNull(organizations.deletedAt)));

  return memberships;
}

/**
 * Get user's personal organization
 */
export async function getPersonalOrganization(userId: string) {
  const orgs = await getUserOrganizations(userId);
  return orgs.find(o => o.organization.isPersonal);
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
 * Check if user is organization admin
 */
export async function isOrgAdmin(userId: string, orgId: string) {
  const [membership] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.clerkUserId, userId),
        eq(organizationMemberships.clerkOrgId, orgId)
      )
    )
    .limit(1);

  return membership?.role === 'org:admin';
}

/**
 * Get all projects belonging to an organization
 */
export async function getOrganizationProjects(orgId: string) {
  return await db.select().from(projects).where(eq(projects.clerkOrgId, orgId));
}

/**
 * Get all members of an organization
 */
export async function getOrganizationMembers(orgId: string) {
  return await db
    .select()
    .from(organizationMemberships)
    .where(eq(organizationMemberships.clerkOrgId, orgId));
}
