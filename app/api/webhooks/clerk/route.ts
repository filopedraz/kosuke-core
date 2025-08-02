import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error('Please add CLERK_WEBHOOK_SECRET to your environment variables');
}

type ClerkEventType = 'user.created' | 'user.updated' | 'user.deleted';

interface ClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  created_at: number;
  updated_at: number;
}

interface ClerkEvent {
  type: ClerkEventType;
  data: ClerkUser;
}

export async function POST(request: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await request.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Handle the webhook
  const { type, data } = evt;
  console.log(`📨 Clerk webhook: ${type} for user ${data.id}`);

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error(`Error processing webhook ${type}:`, error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}

async function handleUserCreated(clerkUser: ClerkUser) {
  const primaryEmail = clerkUser.email_addresses?.[0]?.email_address;

  if (!primaryEmail) {
    console.error('No email address found for user:', clerkUser.id);
    return;
  }

  const fullName = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ') || null;

  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUser.id))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`👤 User already exists in database: ${clerkUser.id} (${primaryEmail})`);
      return;
    }

    // Create new user
    await db.insert(users).values({
      clerkUserId: clerkUser.id,
      email: primaryEmail,
      name: fullName,
      imageUrl: clerkUser.image_url,
      marketingEmails: false, // Default to false, user can opt-in later
      role: 'member',
      createdAt: new Date(clerkUser.created_at),
      updatedAt: new Date(clerkUser.updated_at),
    });

    console.log(`✅ Created user in database: ${clerkUser.id} (${primaryEmail})`);
  } catch (error) {
    console.error('Error creating user in database:', error);
    throw error;
  }
}

async function handleUserUpdated(clerkUser: ClerkUser) {
  const primaryEmail = clerkUser.email_addresses?.[0]?.email_address;

  if (!primaryEmail) {
    console.error('No email address found for user:', clerkUser.id);
    return;
  }

  const fullName = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ') || null;

  try {
    await db
      .update(users)
      .set({
        email: primaryEmail,
        name: fullName,
        imageUrl: clerkUser.image_url,
        updatedAt: new Date(clerkUser.updated_at),
      })
      .where(eq(users.clerkUserId, clerkUser.id));

    console.log(`✅ Updated user in database: ${clerkUser.id} (${primaryEmail})`);
  } catch (error) {
    console.error('Error updating user in database:', error);
    throw error;
  }
}

async function handleUserDeleted(clerkUser: ClerkUser) {
  try {
    // Soft delete - set deletedAt timestamp
    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, clerkUser.id));

    console.log(`✅ Soft deleted user in database: ${clerkUser.id}`);
  } catch (error) {
    console.error('Error soft deleting user in database:', error);
    throw error;
  }
}
