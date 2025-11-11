import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { cleanupCachedOrganizations, getUserOrganizationMemberships } from '@/lib/organizations';
import { createClerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

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

      // Cache organization memberships BEFORE deleting user
      // (we need this list to clean up after deletion)
      const orgMemberships = await getUserOrganizationMemberships(userId);

      // Delete the user from Clerk first (triggers webhook for DB cleanup)
      await client.users.deleteUser(userId);

      // User is now deleted from Clerk - do best-effort org cleanup
      try {
        // Clean up organizations using the cached membership list
        await cleanupCachedOrganizations(userId, orgMemberships);
      } catch (cleanupError) {
        // Log but don't fail - user is already deleted, this is best-effort
        console.error('Error cleaning up organizations after user deletion:', cleanupError);
      }

      // Hard delete from DB (webhook might have already done this, but ensure it's done)
      try {
        await db.delete(users).where(eq(users.clerkUserId, userId));
      } catch (_dbError) {
        // User might already be deleted by webhook - that's ok
        console.log('DB cleanup completed or already done by webhook');
      }

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
