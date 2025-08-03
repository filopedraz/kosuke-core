import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import type { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database using Drizzle ORM
    const [user] = await db.select().from(users).where(eq(users.clerkUserId, userId)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return ApiResponseHandler.success(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { auth } = await import('@/lib/auth/server');
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const pipelinePreference = formData.get('pipelinePreference') as string;

    // Check if this is a pipeline-only update
    const isPipelineOnlyUpdate = pipelinePreference && !name && !email;

    // Validate required fields for profile updates (not pipeline-only updates)
    if (!isPipelineOnlyUpdate && (!name || !email)) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Validate pipeline preference if provided
    if (pipelinePreference && !['kosuke', 'claude-code'].includes(pipelinePreference)) {
      return NextResponse.json({ error: 'Invalid pipeline preference' }, { status: 400 });
    }

    const { db } = await import('@/lib/db/drizzle');
    const { users } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    // Prepare update data
    const updateData: Partial<InferInsertModel<typeof users>> = {
      updatedAt: new Date(),
    };

    // For pipeline-only updates, only update pipeline preference
    if (isPipelineOnlyUpdate) {
      updateData.pipelinePreference = pipelinePreference;
    } else {
      // For profile updates, include name and email
      updateData.name = name;
      updateData.email = email;
      // Include pipeline preference if provided
      if (pipelinePreference) {
        updateData.pipelinePreference = pipelinePreference;
      }
    }

    // Update user in database
    await db.update(users).set(updateData).where(eq(users.clerkUserId, userId));

    return NextResponse.json({ success: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
