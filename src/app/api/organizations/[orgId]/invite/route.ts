import { ApiErrorHandler } from '@/lib/api/errors';
import { isOrgAdmin } from '@/lib/organizations';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface InviteRequestBody {
  email: string;
  role?: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId } = await params;

    const clerk = await clerkClient();

    // Get organization to check if it's personal
    const org = await clerk.organizations.getOrganization({ organizationId: orgId });

    // Block invitations to personal workspaces
    if (org.publicMetadata?.isPersonal === true) {
      return ApiErrorHandler.forbidden('Cannot invite members to personal workspaces');
    }

    // Check if user is admin
    const isAdmin = await isOrgAdmin(userId, orgId);
    if (!isAdmin) {
      return ApiErrorHandler.forbidden('Only organization admins can invite members');
    }

    const body: InviteRequestBody = await request.json();
    const { email, role = 'org:member' } = body;

    if (!email) {
      return ApiErrorHandler.badRequest('Email is required');
    }

    // Create invitation via Clerk
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role,
      inviterUserId: userId,
    });

    return NextResponse.json({ data: invitation });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return ApiErrorHandler.handle(error);
  }
}
