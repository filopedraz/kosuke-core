import { db } from '@/lib/db/drizzle';
import { organizations, projects } from '@/lib/db/schema';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export * from './utils';

/**
 * Get all organizations a user belongs to via Clerk API
 */
export async function getUserOrganizations(userId: string) {
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({ userId });

  // Fetch org details from our DB for cached data
  const orgIds = memberships.data.map(m => m.organization.id);
  if (orgIds.length === 0) return [];

  const orgs = await db.select().from(organizations);

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

interface CachedMembership {
  organization: {
    id: string;
    name: string;
  };
}

/**
 * Get all organization memberships for a user (cached for safe deletion)
 */
export async function getUserOrganizationMemberships(userId: string): Promise<CachedMembership[]> {
  const clerk = await clerkClient();

  // Get all organizations the user is a member of (with pagination)
  let allMemberships: CachedMembership[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId,
      limit,
      offset,
    });

    allMemberships = allMemberships.concat(memberships.data);
    hasMore = memberships.data.length === limit;
    offset += limit;
  }

  return allMemberships;
}

/**
 * Clean up organization memberships using cached membership data
 * - Deletes personal workspaces
 * - Deletes shared orgs if user is last member or last admin
 * - Leaves non-personal organizations if other members remain
 * Note: userId may be deleted from Clerk at this point
 */
export async function cleanupCachedOrganizations(userId: string, memberships: CachedMembership[]) {
  const clerk = await clerkClient();

  console.log(`📋 Processing ${memberships.length} organization(s) for user ${userId}`);

  // Process each organization membership
  for (const membership of memberships) {
    const orgId = membership.organization.id;

    try {
      // Check if it's a personal organization
      const org = await clerk.organizations.getOrganization({ organizationId: orgId });

      if (org.publicMetadata?.isPersonal === true) {
        // Delete personal organizations
        await clerk.organizations.deleteOrganization(orgId);
        console.log(`🗑️ Deleted personal workspace: ${orgId} (${org.name})`);
      } else {
        // For shared organizations, check if user created it or is last member
        try {
          // NOTE: User is already deleted from Clerk at this point,
          // so member count is AFTER their removal
          const orgMemberships = await clerk.organizations.getOrganizationMembershipList({
            organizationId: orgId,
          });

          const remainingMembers = orgMemberships.totalCount;

          // Check if user is the creator/owner from DB
          const [dbOrg] = await db
            .select({ createdBy: organizations.createdBy })
            .from(organizations)
            .where(eq(organizations.clerkOrgId, orgId))
            .limit(1);

          // User is creator if they match createdBy (handles null createdBy as false)
          const isCreator = dbOrg?.createdBy === userId;

          // If createdBy is null (original creator deleted), treat as orphaned
          const isOrphaned = dbOrg && dbOrg.createdBy === null;

          if (remainingMembers === 0 || isCreator || isOrphaned) {
            // Delete the org if:
            // - No members remaining (user was the last one), OR
            // - User is/was the creator, OR
            // - Org is orphaned (original creator gone, clean up on any deletion)
            await clerk.organizations.deleteOrganization(orgId);

            // Also clean up DB directly
            await db.delete(projects).where(eq(projects.clerkOrgId, orgId));
            await db.delete(organizations).where(eq(organizations.clerkOrgId, orgId));

            let reason = 'no members remaining';
            if (isCreator) reason = 'creator';
            else if (isOrphaned) reason = 'orphaned (no creator)';

            console.log(`🗑️ Deleted organization ${orgId} (${org.name}) - ${reason}`);
          } else {
            // Remove user membership (may fail if user already deleted)
            try {
              await clerk.organizations.deleteOrganizationMembership({
                organizationId: orgId,
                userId,
              });
              console.log(`👋 Left organization: ${orgId} (${org.name})`);
            } catch (_membershipError) {
              // If user is already deleted, this will fail - that's ok, user is already removed
              console.log(
                `ℹ️ Could not remove membership for ${orgId} (user likely already deleted)`
              );
            }
          }
        } catch (membershipError) {
          // If we can't get memberships, try to leave anyway
          console.error(`⚠️ Could not check memberships for ${orgId}:`, membershipError);
          try {
            await clerk.organizations.deleteOrganizationMembership({
              organizationId: orgId,
              userId,
            });
            console.log(`👋 Left organization: ${orgId} (${org.name})`);
          } catch (_fallbackError) {
            console.log(
              `ℹ️ Could not remove membership for ${orgId} (user likely already deleted)`
            );
          }
        }
      }
    } catch (orgError) {
      console.error(`⚠️ Failed to process organization ${orgId}:`, orgError);
    }
  }
}
