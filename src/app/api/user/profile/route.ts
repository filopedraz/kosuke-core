import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { createClerkClient } from '@clerk/nextjs/server';
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
      // User not found in database, but exists in Clerk - attempt to sync
      console.log(`👤 User ${userId} not found in database, attempting to sync from Clerk...`);

      try {
        const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUser = await client.users.getUser(userId);

        if (!clerkUser) {
          return NextResponse.json({ error: 'User not found in Clerk' }, { status: 404 });
        }

        const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (!primaryEmail) {
          console.error(`No email address found for Clerk user: ${userId}`);
          return NextResponse.json({ error: 'User email not found' }, { status: 404 });
        }

        const fullName =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;

        // Create user in database
        const newUser = {
          clerkUserId: clerkUser.id,
          email: primaryEmail,
          name: fullName,
          imageUrl: clerkUser.imageUrl,
          marketingEmails: false,
          role: 'member' as const,
          createdAt: new Date(clerkUser.createdAt),
          updatedAt: new Date(clerkUser.updatedAt),
        };

        try {
          await db.insert(users).values(newUser);
          console.log(`✅ Auto-created user in database: ${userId} (${primaryEmail})`);

          // Return the newly created user data
          return ApiResponseHandler.success(newUser);
        } catch (insertError: unknown) {
          // Handle email constraint conflicts
          if (
            insertError &&
            typeof insertError === 'object' &&
            'code' in insertError &&
            'constraint' in insertError &&
            insertError.code === '23505' &&
            insertError.constraint === 'users_email_unique'
          ) {
            console.log(`⚠️ Email conflict for ${primaryEmail}, updating existing record...`);

            // Update existing user with this Clerk ID
            await db
              .update(users)
              .set({
                clerkUserId: clerkUser.id,
                name: fullName,
                imageUrl: clerkUser.imageUrl,
                updatedAt: new Date(),
                deletedAt: null, // Ensure user is not soft-deleted
              })
              .where(eq(users.email, primaryEmail));

            // Fetch and return the updated user
            const [updatedUser] = await db
              .select()
              .from(users)
              .where(eq(users.clerkUserId, userId))
              .limit(1);
            return ApiResponseHandler.success(updatedUser);
          }
          throw insertError;
        }
      } catch (clerkError) {
        console.error(`Error syncing user ${userId} from Clerk:`, clerkError);
        return NextResponse.json({ error: 'Failed to sync user from Clerk' }, { status: 404 });
      }
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
