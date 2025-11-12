import { ApiErrorHandler } from '@/lib/api/errors';
import { clerkService } from '@/lib/clerk';
import { auth } from '@clerk/nextjs/server';
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

    // Check if current user is admin
    const isAdmin = await clerkService.isOrgAdmin(currentUserId, orgId);
    if (!isAdmin) {
      return ApiErrorHandler.forbidden('Only organization admins can remove members');
    }

    // Check if it's a personal workspace
    const org = await clerkService.getOrganization(orgId);
    if (org.isPersonal) {
      return ApiErrorHandler.forbidden('Cannot remove members from personal workspaces');
    }

    // Prevent removing yourself
    if (userId === currentUserId) {
      return ApiErrorHandler.badRequest('Cannot remove yourself. Use leave organization instead.');
    }

    // Remove the member
    await clerkService.deleteOrganizationMembership(orgId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return ApiErrorHandler.handle(error);
  }
}
