import { ApiErrorHandler } from '@/lib/api/errors';
import { clerkClient } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { db } from '@/lib/db/drizzle';
import {
  organizationInvitations,
  organizationMemberships,
  organizations,
  users,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

type ClerkEventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'organizationMembership.created'
  | 'organizationMembership.updated'
  | 'organizationMembership.deleted'
  | 'organizationInvitation.created'
  | 'organizationInvitation.accepted'
  | 'organizationInvitation.revoked';

interface DatabaseError {
  code?: string;
  constraint_name?: string;
  message?: string;
}

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

interface ClerkOrganization {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  created_by: string;
  public_metadata?: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

interface ClerkOrganizationMembership {
  id: string;
  organization: { id: string };
  public_user_data: { user_id: string };
  role: string;
  created_at: number;
  updated_at: number;
}

interface ClerkOrganizationInvitation {
  id: string;
  organization_id: string;
  email_address: string;
  role: string;
  public_metadata?: Record<string, unknown>;
  created_at: number;
  status: string;
}

interface ClerkEvent {
  type: ClerkEventType;
  data: ClerkUser | ClerkOrganization | ClerkOrganizationMembership | ClerkOrganizationInvitation;
}

export async function POST(request: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return ApiErrorHandler.badRequest('Error occured -- no svix headers');
  }

  // Get the body
  const payload = await request.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

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
    return ApiErrorHandler.badRequest('Error occured');
  }

  // Handle the webhook
  const { type, data } = evt;
  console.log(`📨 Clerk webhook: ${type}`);

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data as ClerkUser);
        break;
      case 'user.updated':
        await handleUserUpdated(data as ClerkUser);
        break;
      case 'user.deleted':
        await handleUserDeleted(data as ClerkUser);
        break;
      case 'organization.created':
        await handleOrganizationCreated(data as ClerkOrganization);
        break;
      case 'organization.updated':
        await handleOrganizationUpdated(data as ClerkOrganization);
        break;
      case 'organization.deleted':
        await handleOrganizationDeleted(data as ClerkOrganization);
        break;
      case 'organizationMembership.created':
        await handleMembershipCreated(data as ClerkOrganizationMembership);
        break;
      case 'organizationMembership.deleted':
        await handleMembershipDeleted(data as ClerkOrganizationMembership);
        break;
      case 'organizationInvitation.created':
        await handleInvitationCreated(data as ClerkOrganizationInvitation);
        break;
      case 'organizationInvitation.accepted':
        await handleInvitationAccepted(data as ClerkOrganizationInvitation);
        break;
      case 'organizationInvitation.revoked':
        await handleInvitationRevoked(data as ClerkOrganizationInvitation);
        break;
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error(`Error processing webhook ${type}:`, error);
    return ApiErrorHandler.handle(error);
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
    // Check if user already exists by clerkUserId
    const existingUserByClerkId = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUser.id))
      .limit(1);

    if (existingUserByClerkId.length > 0) {
      console.log(`👤 User already exists in database: ${clerkUser.id} (${primaryEmail})`);
      return;
    }

    // Try to insert new user, handle email constraint gracefully
    try {
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

      // Create personal organization for the user
      await createPersonalOrganization(clerkUser);
    } catch (insertError: unknown) {
      // Handle duplicate email constraint specifically
      const dbError = insertError as DatabaseError;
      if (dbError?.code === '23505' && dbError?.constraint_name === 'users_email_unique') {
        console.log(
          `⚠️ User with email ${primaryEmail} already exists, but with different Clerk ID. This is likely a recreated account.`
        );

        // Check if there's an existing user with this email that might be soft-deleted
        const existingUserByEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, primaryEmail))
          .limit(1);

        if (existingUserByEmail.length > 0) {
          const existingUser = existingUserByEmail[0];

          // If the existing user is soft-deleted, update it with new Clerk ID
          if (existingUser.deletedAt) {
            await db
              .update(users)
              .set({
                clerkUserId: clerkUser.id,
                name: fullName,
                imageUrl: clerkUser.image_url,
                deletedAt: null, // Restore the user
                updatedAt: new Date(clerkUser.updated_at),
              })
              .where(eq(users.email, primaryEmail));

            console.log(
              `✅ Restored soft-deleted user and updated Clerk ID: ${clerkUser.id} (${primaryEmail})`
            );

            // Create personal organization for restored user
            await createPersonalOrganization(clerkUser);
          } else {
            console.log(
              `ℹ️ Active user with email ${primaryEmail} already exists with different Clerk ID. Skipping creation.`
            );
          }
        }

        // Don't throw error - webhook should succeed even if user exists
        return;
      }

      // For other database errors, re-throw
      throw insertError;
    }
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

// Helper function to create personal organization

async function createPersonalOrganization(clerkUser: ClerkUser) {
  try {
    const primaryEmail = clerkUser.email_addresses?.[0]?.email_address;
    const firstName = clerkUser.first_name || primaryEmail?.split('@')[0] || 'User';

    const clerk = await clerkClient();
    const personalOrg = await clerk.organizations.createOrganization({
      name: `${firstName}'s Workspace`,
      slug: `${clerkUser.id}-personal`,
      createdBy: clerkUser.id,
      publicMetadata: {
        isPersonal: true,
      },
    });

    console.log(
      `✅ Created personal organization for user: ${personalOrg.id} (${personalOrg.name})`
    );
  } catch (error) {
    console.error(`⚠️ Failed to create personal organization for user ${clerkUser.id}:`, error);
    // Don't throw - we don't want to fail user creation if org creation fails
  }
}

// Organization webhook handlers

async function handleOrganizationCreated(data: ClerkOrganization) {
  try {
    const isPersonal = data.public_metadata?.isPersonal === true;

    await db.insert(organizations).values({
      clerkOrgId: data.id,
      name: data.name,
      slug: data.slug,
      imageUrl: data.image_url,
      createdBy: data.created_by,
      isPersonal,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });

    console.log(`✅ Created organization in database: ${data.id} (${data.name})`);
  } catch (error) {
    console.error('Error creating organization in database:', error);
    throw error;
  }
}

async function handleOrganizationUpdated(data: ClerkOrganization) {
  try {
    await db
      .update(organizations)
      .set({
        name: data.name,
        slug: data.slug,
        imageUrl: data.image_url,
        updatedAt: new Date(data.updated_at),
      })
      .where(eq(organizations.clerkOrgId, data.id));

    console.log(`✅ Updated organization in database: ${data.id} (${data.name})`);
  } catch (error) {
    console.error('Error updating organization in database:', error);
    throw error;
  }
}

async function handleOrganizationDeleted(data: ClerkOrganization) {
  try {
    // Soft delete
    await db
      .update(organizations)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizations.clerkOrgId, data.id));

    console.log(`✅ Soft deleted organization in database: ${data.id}`);
  } catch (error) {
    console.error('Error soft deleting organization in database:', error);
    throw error;
  }
}

async function handleMembershipCreated(data: ClerkOrganizationMembership) {
  try {
    await db.insert(organizationMemberships).values({
      clerkOrgId: data.organization.id,
      clerkUserId: data.public_user_data.user_id,
      role: data.role,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });

    console.log(
      `✅ Created organization membership: ${data.public_user_data.user_id} → ${data.organization.id}`
    );
  } catch (error) {
    console.error('Error creating organization membership in database:', error);
    throw error;
  }
}

async function handleMembershipDeleted(data: ClerkOrganizationMembership) {
  try {
    await db
      .delete(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.clerkOrgId, data.organization.id),
          eq(organizationMemberships.clerkUserId, data.public_user_data.user_id)
        )
      );

    console.log(
      `✅ Deleted organization membership: ${data.public_user_data.user_id} → ${data.organization.id}`
    );
  } catch (error) {
    console.error('Error deleting organization membership in database:', error);
    throw error;
  }
}

async function handleInvitationCreated(data: ClerkOrganizationInvitation) {
  try {
    await db.insert(organizationInvitations).values({
      clerkInvitationId: data.id,
      clerkOrgId: data.organization_id,
      email: data.email_address,
      role: data.role,
      status: 'pending',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.created_at),
    });

    console.log(
      `✅ Created organization invitation: ${data.email_address} → ${data.organization_id}`
    );
  } catch (error) {
    console.error('Error creating organization invitation in database:', error);
    throw error;
  }
}

async function handleInvitationAccepted(data: ClerkOrganizationInvitation) {
  try {
    await db
      .update(organizationInvitations)
      .set({
        status: 'accepted',
        updatedAt: new Date(),
      })
      .where(eq(organizationInvitations.clerkInvitationId, data.id));

    console.log(`✅ Accepted organization invitation: ${data.id}`);
  } catch (error) {
    console.error('Error updating organization invitation in database:', error);
    throw error;
  }
}

async function handleInvitationRevoked(data: ClerkOrganizationInvitation) {
  try {
    await db
      .update(organizationInvitations)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(organizationInvitations.clerkInvitationId, data.id));

    console.log(`✅ Revoked organization invitation: ${data.id}`);
  } catch (error) {
    console.error('Error updating organization invitation in database:', error);
    throw error;
  }
}
