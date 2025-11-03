import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { marketingEmails } = await request.json();

    if (typeof marketingEmails !== 'boolean') {
      return ApiErrorHandler.badRequest('Invalid marketingEmails value');
    }

    // Update user's notification preferences in database
    await db
      .update(users)
      .set({
        marketingEmails,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userId));

    return NextResponse.json({
      success: 'Notification preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return ApiErrorHandler.handle(error);
  }
}
