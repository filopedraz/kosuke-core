import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth';
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
      return ApiErrorHandler.unauthorized();
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
          return ApiErrorHandler.notFound('User not found in Clerk');
        }

        const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (!primaryEmail) {
          console.error(`No email address found for Clerk user: ${userId}`);
          return ApiErrorHandler.notFound('User email not found');
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
        return ApiErrorHandler.notFound('Failed to sync user from Clerk');
      }
    }

    return ApiResponseHandler.success(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return ApiErrorHandler.handle(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { auth } = await import('@/lib/auth');
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const pipelinePreference = formData.get('pipelinePreference') as string;

    // Check if this is a pipeline-only update
    const isPipelineOnlyUpdate = pipelinePreference && !name && !email;

    // Validate required fields for profile updates (not pipeline-only updates)
    if (!isPipelineOnlyUpdate && (!name || !email)) {
      return ApiErrorHandler.badRequest('Name and email are required');
    }

    // Validate pipeline preference if provided
    if (pipelinePreference && !['kosuke', 'claude-code'].includes(pipelinePreference)) {
      return ApiErrorHandler.badRequest('Invalid pipeline preference');
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
    return ApiErrorHandler.handle(error);
  }
}
