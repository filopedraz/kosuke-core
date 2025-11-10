import { ApiErrorHandler } from '@/lib/api/errors';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId, userId } = await params;

    const client = await clerkClient();

    // Check if current user is admin
    const currentUserMemberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const currentUserMembership = currentUserMemberships.data.find(
      m => m.publicUserData?.userId === currentUserId
    );

    if (!currentUserMembership || currentUserMembership.role !== 'org:admin') {
      return ApiErrorHandler.forbidden('Only organization admins can remove members');
    }

    // Check if it's a personal workspace
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    if (org.publicMetadata?.isPersonal === true) {
      return ApiErrorHandler.forbidden('Cannot remove members from personal workspaces');
    }

    // Prevent removing yourself
    if (userId === currentUserId) {
      return ApiErrorHandler.badRequest('Cannot remove yourself. Use leave organization instead.');
    }

    // Remove the member
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return ApiErrorHandler.handle(error);
  }
}
