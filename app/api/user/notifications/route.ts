import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { marketingEmails } = await request.json();

    if (typeof marketingEmails !== 'boolean') {
      return NextResponse.json({ error: 'Invalid marketingEmails value' }, { status: 400 });
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
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
