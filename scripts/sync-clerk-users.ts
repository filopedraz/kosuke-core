#!/usr/bin/env tsx

/**
 * One-time script to sync all Clerk users to the database
 * Run this after accidentally deleting users from the database
 *
 * Usage: npx tsx scripts/sync-clerk-users.ts
 */

import { createClerkClient } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is required');
  process.exit(1);
}

interface ClerkUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  image_url: string;
  created_at: number;
  updated_at: number;
}

async function syncClerkUsers() {
  console.log('🔄 Starting Clerk user synchronization...');

  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

  try {
    // Get all users from Clerk
    console.log('📥 Fetching users from Clerk...');
    const clerkUsers = await clerk.users.getUserList({ limit: 500 });

    console.log(`👥 Found ${clerkUsers.data.length} users in Clerk`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const clerkUser of clerkUsers.data) {
      try {
        const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;

        if (!primaryEmail) {
          console.log(`⚠️ Skipping user ${clerkUser.id} - no email address`);
          skipped++;
          continue;
        }

        const fullName =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;

        // Check if user already exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.clerkUserId, clerkUser.id))
          .limit(1);

        if (existingUser.length > 0) {
          // User exists, update their info
          await db
            .update(users)
            .set({
              email: primaryEmail,
              name: fullName,
              imageUrl: clerkUser.imageUrl,
              updatedAt: new Date(),
              deletedAt: null, // Ensure user is not soft-deleted
            })
            .where(eq(users.clerkUserId, clerkUser.id));

          console.log(`✅ Updated user: ${clerkUser.id} (${primaryEmail})`);
          updated++;
        } else {
          // User doesn't exist, create them
          try {
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

            console.log(`✅ Created user: ${clerkUser.id} (${primaryEmail})`);
            created++;
          } catch (insertError: any) {
            // Handle email constraint conflicts
            if (insertError?.code === '23505' && insertError?.constraint === 'users_email_unique') {
              console.log(`⚠️ Email conflict for ${primaryEmail}, updating existing record...`);

              // Update existing user with this email
              await db
                .update(users)
                .set({
                  clerkUserId: clerkUser.id,
                  name: fullName,
                  imageUrl: clerkUser.imageUrl,
                  updatedAt: new Date(),
                  deletedAt: null,
                })
                .where(eq(users.email, primaryEmail));

              updated++;
            } else {
              throw insertError;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing user ${clerkUser.id}:`, error);
        errors++;
      }
    }

    console.log('\n📊 Synchronization complete!');
    console.log(`✅ Created: ${created} users`);
    console.log(`🔄 Updated: ${updated} users`);
    console.log(`⏭️ Skipped: ${skipped} users`);
    console.log(`❌ Errors: ${errors} users`);
  } catch (error) {
    console.error('❌ Failed to sync users:', error);
    process.exit(1);
  }
}

// Run the sync
syncClerkUsers()
  .then(() => {
    console.log('🎉 Sync completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  });
