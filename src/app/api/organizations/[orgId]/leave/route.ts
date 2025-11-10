import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ApiErrorHandler } from '@/lib/api/errors';

export async function POST(_request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId } = await params;

    const client = await clerkClient();

    // Get the user's membership in this organization
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const membership = memberships.data.find(m => m.publicUserData?.userId === userId);

    if (!membership) {
      return ApiErrorHandler.notFound('Membership not found');
    }

    // Check if it's a personal workspace
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    if (org.publicMetadata?.isPersonal === true) {
      return ApiErrorHandler.forbidden('Cannot leave personal workspace');
    }

    // Delete the membership
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to leave organization:', error);
    return ApiErrorHandler.handle(error);
  }
}
