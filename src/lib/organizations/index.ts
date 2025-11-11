import { db } from '@/lib/db/drizzle';
import { organizations, projects } from '@/lib/db/schema';
import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export * from './utils';

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
