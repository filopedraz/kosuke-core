import { ApiErrorHandler } from '@/lib/api/errors';
import { clerkService } from '@/lib/clerk';
import { auth } from '@clerk/nextjs/server';
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

    // Get organization
    const org = await clerkService.getOrganization(orgId);

    if (!org) {
      return ApiErrorHandler.notFound('Organization not found');
    }

    if (org.isPersonal) {
      return ApiErrorHandler.badRequest('Cannot transfer ownership of personal workspaces');
    }

    if (org.createdBy !== userId) {
      return ApiErrorHandler.forbidden('Only the organization owner can transfer ownership');
    }

    const body = await request.json();
    const result = transferOwnershipSchema.safeParse(body);

    if (!result.success) {
      return ApiErrorHandler.badRequest(result.error.issues.map(e => e.message).join(', '));
    }

    const { newOwnerId } = result.data;

    if (newOwnerId === userId) {
      return ApiErrorHandler.badRequest('You are already the owner');
    }

    // Verify new owner is a member
    const memberships = await clerkService.getOrganizationMembers(orgId);
    const newOwnerMembership = memberships.data.find(m => m.publicUserData?.userId === newOwnerId);

    if (!newOwnerMembership) {
      return ApiErrorHandler.badRequest('New owner must be a member of the organization');
    }

    // Update roles
    await clerkService.updateMemberRole(orgId, newOwnerId, 'org:admin');
    await clerkService.updateMemberRole(orgId, userId, 'org:member');

    // Track transfer in metadata
    await clerkService.updateOrganizationTransfer(orgId, { from: userId, to: newOwnerId });

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
