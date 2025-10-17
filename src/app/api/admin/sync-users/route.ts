import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { createClerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Periodic sync endpoint to ensure Clerk and database users are in sync
 * Should be called periodically via cron job or monitoring system
 *
 * Usage: POST /api/admin/sync-users
 *
 * Optional query parameters:
 * - dry_run=true: Only check for discrepancies without making changes
 * - force=true: Force sync even if no issues are detected
 */

// Protect this endpoint - only allow in development or with proper auth
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Simple API key protection for admin endpoints
    const authHeader = request.headers.get('authorization');
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && (!authHeader || authHeader !== `Bearer ${ADMIN_API_KEY}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get('dry_run') === 'true';
    const force = searchParams.get('force') === 'true';

    console.log(`🔄 Starting user sync (dry_run: ${dryRun}, force: ${force})`);

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

    if (!process.env.CLERK_SECRET_KEY) {
      return NextResponse.json({ error: 'Clerk secret key not configured' }, { status: 500 });
    }

    // Get all users from Clerk (paginated)
    const clerkUsers: Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      emailAddresses: Array<{ emailAddress: string }>;
      imageUrl: string;
      createdAt: number;
      updatedAt: number;
    }> = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      const response = await clerk.users.getUserList({
        limit,
        offset,
        orderBy: '-created_at',
      });

      clerkUsers.push(...response.data);
      hasMore = response.data.length === limit;
      offset += limit;
    }

    console.log(`👥 Found ${clerkUsers.length} users in Clerk`);

    // Get all users from database
    const dbUsers = await db.select().from(users);
    console.log(`🗄️ Found ${dbUsers.length} users in database`);

    // Create maps for efficient lookups
    const clerkUserMap = new Map(clerkUsers.map(u => [u.id, u]));
    const dbUserMap = new Map(dbUsers.map(u => [u.clerkUserId, u]));

    // Find discrepancies
    const missingInDb = clerkUsers.filter(cu => !dbUserMap.has(cu.id));
    const missingInClerk = dbUsers.filter(
      du => du.clerkUserId && !clerkUserMap.has(du.clerkUserId) && !du.deletedAt
    );
    const outdatedInDb = clerkUsers.filter(cu => {
      const dbUser = dbUserMap.get(cu.id);
      if (!dbUser) return false;

      const clerkUpdated = new Date(cu.updatedAt);
      const dbUpdated = new Date(dbUser.updatedAt);

      return clerkUpdated > dbUpdated;
    });

    const results = {
      total_clerk_users: clerkUsers.length,
      total_db_users: dbUsers.length,
      missing_in_db: missingInDb.length,
      missing_in_clerk: missingInClerk.length,
      outdated_in_db: outdatedInDb.length,
      actions_taken: {
        created: 0,
        updated: 0,
        soft_deleted: 0,
        errors: 0,
      },
      dry_run: dryRun,
    };

    console.log('📊 Sync analysis:', {
      missingInDb: missingInDb.length,
      missingInClerk: missingInClerk.length,
      outdatedInDb: outdatedInDb.length,
    });

    if (
      !force &&
      missingInDb.length === 0 &&
      missingInClerk.length === 0 &&
      outdatedInDb.length === 0
    ) {
      console.log('✅ No sync issues detected');
      return NextResponse.json({
        message: 'No sync issues detected',
        results,
      });
    }

    if (dryRun) {
      console.log('🔍 Dry run mode - no changes will be made');

      if (missingInDb.length > 0) {
        console.log(
          'Users missing in DB:',
          missingInDb.map(u => `${u.id} (${u.emailAddresses?.[0]?.emailAddress})`)
        );
      }

      if (missingInClerk.length > 0) {
        console.log(
          'Users missing in Clerk:',
          missingInClerk.map(u => `${u.clerkUserId} (${u.email})`)
        );
      }

      if (outdatedInDb.length > 0) {
        console.log(
          'Outdated users in DB:',
          outdatedInDb.map(u => `${u.id} (${u.emailAddresses?.[0]?.emailAddress})`)
        );
      }

      return NextResponse.json({
        message: 'Dry run completed',
        results,
        discrepancies: {
          missing_in_db: missingInDb.map(u => ({
            clerk_id: u.id,
            email: u.emailAddresses?.[0]?.emailAddress,
          })),
          missing_in_clerk: missingInClerk.map(u => ({
            clerk_id: u.clerkUserId,
            email: u.email,
          })),
          outdated_in_db: outdatedInDb.map(u => ({
            clerk_id: u.id,
            email: u.emailAddresses?.[0]?.emailAddress,
          })),
        },
      });
    }

    // Process missing users in database
    for (const clerkUser of missingInDb) {
      try {
        const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (!primaryEmail) continue;

        const fullName =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;

        await db.insert(users).values({
          clerkUserId: clerkUser.id,
          email: primaryEmail,
          name: fullName,
          imageUrl: clerkUser.imageUrl,
          marketingEmails: false,
          role: 'member',
          createdAt: new Date(clerkUser.createdAt),
          updatedAt: new Date(clerkUser.updatedAt),
        });

        results.actions_taken.created++;
        console.log(`✅ Created user: ${clerkUser.id} (${primaryEmail})`);
      } catch (error: unknown) {
        console.error(`❌ Error creating user ${clerkUser.id}:`, error);
        results.actions_taken.errors++;
      }
    }

    // Process outdated users in database
    for (const clerkUser of outdatedInDb) {
      try {
        const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (!primaryEmail) continue;

        const fullName =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;

        await db
          .update(users)
          .set({
            email: primaryEmail,
            name: fullName,
            imageUrl: clerkUser.imageUrl,
            updatedAt: new Date(clerkUser.updatedAt),
          })
          .where(eq(users.clerkUserId, clerkUser.id));

        results.actions_taken.updated++;
        console.log(`🔄 Updated user: ${clerkUser.id} (${primaryEmail})`);
      } catch (error) {
        console.error(`❌ Error updating user ${clerkUser.id}:`, error);
        results.actions_taken.errors++;
      }
    }

    // Soft delete users missing in Clerk (they might have been deleted there)
    for (const dbUser of missingInClerk) {
      try {
        await db
          .update(users)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.clerkUserId, dbUser.clerkUserId));

        results.actions_taken.soft_deleted++;
        console.log(`🗑️ Soft deleted user: ${dbUser.clerkUserId} (${dbUser.email})`);
      } catch (error) {
        console.error(`❌ Error soft deleting user ${dbUser.clerkUserId}:`, error);
        results.actions_taken.errors++;
      }
    }

    console.log('🎉 Sync completed:', results.actions_taken);

    return NextResponse.json({
      message: 'User sync completed successfully',
      results,
    });
  } catch (error) {
    console.error('❌ User sync failed:', error);
    return NextResponse.json(
      {
        error: 'User sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
