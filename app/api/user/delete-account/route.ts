import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { createClerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Verify the user exists in Clerk
      const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const user = await client.users.getUser(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // First, soft delete the user in our database
      await db
        .update(users)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, userId));

      // Then delete the user from Clerk
      await client.users.deleteUser(userId);

      return NextResponse.json({
        success: 'Account deleted successfully',
      });
    } catch (clerkError: unknown) {
      console.error('Clerk error deleting user:', clerkError);

      // If Clerk deletion fails, revert the database change
      await db
        .update(users)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, userId));

      if (
        typeof clerkError === 'object' &&
        clerkError !== null &&
        'status' in clerkError &&
        (clerkError as { status: number }).status === 422
      ) {
        return NextResponse.json(
          {
            error: 'Unable to delete account. Please try again.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to delete account. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete account',
      },
      { status: 500 }
    );
  }
}
