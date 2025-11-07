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
    const clerk = await clerkClient();
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
