import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { organizations } from '@/lib/db/schema';
import { createClerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * DELETE /api/user/delete-account
 *
 * Deletes the authenticated user's account.
 *
 * Flow:
 * 1. Validates user exists in Clerk
 * 2. Checks if user owns team organizations with other members
 * 3. If yes, prevents deletion and returns error
 * 4. If no, deletes user from Clerk (triggers webhook for cleanup)
 * 5. Returns success immediately
 *
 * Note: Webhook handles deletion of personal workspaces and empty team orgs
 */
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    try {
      // Verify the user exists in Clerk
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const user = await client.users.getUser(userId);
      if (!user) {
        return ApiErrorHandler.notFound('User not found');
      }

      // Check if user owns any team organizations (non-personal)
      const ownedOrganizations = await db
        .select()
        .from(organizations)
        .where(eq(organizations.createdBy, userId));

      const teamOrganizations = ownedOrganizations.filter(org => !org.isPersonal);

      // Collect all team orgs that have other members
      const orgsWithMembers: string[] = [];

      if (teamOrganizations.length > 0) {
        for (const org of teamOrganizations) {
          const memberships = await client.organizations.getOrganizationMembershipList({
            organizationId: org.clerkOrgId,
          });

          // Check if there are other members besides the current user
          const otherMembers = memberships.data.filter(m => m.publicUserData?.userId !== userId);

          if (otherMembers.length > 0) {
            orgsWithMembers.push(org.name);
          }
        }

        // If any orgs have members, block deletion and show ALL of them
        if (orgsWithMembers.length > 0) {
          const orgList = orgsWithMembers.map(name => `"${name}"`).join(', ');
          const message =
            orgsWithMembers.length === 1
              ? `Cannot delete account. You must transfer ownership or remove all members from ${orgList} before deleting your account.`
              : `Cannot delete account. You must transfer ownership or remove all members from these organizations: ${orgList}.`;

          return ApiErrorHandler.badRequest(message);
        }
      }

      // All checks passed, proceed with deletion
      await client.users.deleteUser(userId);

      return NextResponse.json({
        success: 'Account deleted successfully',
      });
    } catch (clerkError: unknown) {
      console.error('Clerk error deleting user:', clerkError);

      if (
        typeof clerkError === 'object' &&
        clerkError !== null &&
        'status' in clerkError &&
        (clerkError as { status: number }).status === 422
      ) {
        return ApiErrorHandler.badRequest('Unable to delete account. Please try again.');
      }

      return ApiErrorHandler.handle(clerkError);
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    return ApiErrorHandler.handle(error);
  }
}
