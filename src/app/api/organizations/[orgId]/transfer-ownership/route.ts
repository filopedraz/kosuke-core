import { ApiErrorHandler } from '@/lib/api/errors';
import { db } from '@/lib/db/drizzle';
import { organizations } from '@/lib/db/schema';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, 'New owner ID is required'),
});

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId } = await params;
    const client = await clerkClient();

    // Get organization from DB
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, orgId))
      .limit(1);

    if (!org) {
      return ApiErrorHandler.notFound('Organization not found');
    }

    // Get organization from Clerk for metadata
    const clerkOrg = await client.organizations.getOrganization({ organizationId: orgId });

    // Check if current user is the creator
    if (org.createdBy !== userId) {
      return ApiErrorHandler.forbidden('Only the organization owner can transfer ownership');
    }

    // Cannot transfer personal workspaces
    if (org.isPersonal) {
      return ApiErrorHandler.badRequest('Cannot transfer ownership of personal workspaces');
    }

    // Validate request body
    const body = await request.json();
    const result = transferOwnershipSchema.safeParse(body);

    if (!result.success) {
      return ApiErrorHandler.badRequest(result.error.issues.map(e => e.message).join(', '));
    }

    const { newOwnerId } = result.data;

    // Cannot transfer to yourself
    if (newOwnerId === userId) {
      return ApiErrorHandler.badRequest('You are already the owner');
    }

    // Verify new owner is a member of the organization
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const newOwnerMembership = memberships.data.find(m => m.publicUserData?.userId === newOwnerId);

    if (!newOwnerMembership) {
      return ApiErrorHandler.badRequest('New owner must be a member of the organization');
    }

    // Update new owner to admin role in Clerk
    await client.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: newOwnerId,
      role: 'org:admin',
    });

    // Update old owner to member role in Clerk (demote)
    await client.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: userId,
      role: 'org:member',
    });

    // Update organization creator in database
    await db
      .update(organizations)
      .set({
        createdBy: newOwnerId,
        updatedAt: new Date(),
      })
      .where(eq(organizations.clerkOrgId, orgId));

    // Update organization metadata in Clerk to reflect new creator
    await client.organizations.updateOrganization(orgId, {
      publicMetadata: {
        ...clerkOrg.publicMetadata,
        creatorId: newOwnerId,
      },
    });

    console.log(
      `👑 Ownership transferred for org ${org.name} (${orgId}): ${userId} → ${newOwnerId}`
    );

    return NextResponse.json({
      success: true,
      message: 'Ownership transferred successfully',
    });
  } catch (error) {
    console.error('Failed to transfer ownership:', error);
    return ApiErrorHandler.handle(error);
  }
}
