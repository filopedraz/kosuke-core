import { ApiErrorHandler } from '@/lib/api/errors';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; invitationId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId, invitationId } = await params;

    const client = await clerkClient();

    // Check if current user is admin
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const membership = memberships.data.find(m => m.publicUserData?.userId === userId);

    if (!membership || membership.role !== 'org:admin') {
      return ApiErrorHandler.forbidden('Only organization admins can revoke invitations');
    }

    // Revoke the invitation
    await client.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId: invitationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke invitation:', error);
    return ApiErrorHandler.handle(error);
  }
}
