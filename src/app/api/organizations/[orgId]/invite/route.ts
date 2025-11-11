import { ApiErrorHandler } from '@/lib/api/errors';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'),
  role: z.enum(['org:admin', 'org:member']).optional().default('org:member'),
});

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId } = await params;

    const client = await clerkClient();

    // Get organization to check if it's personal
    const org = await client.organizations.getOrganization({ organizationId: orgId });

    // Block invitations to personal workspaces
    if (org.publicMetadata?.isPersonal === true) {
      return ApiErrorHandler.forbidden('Cannot invite members to personal workspaces');
    }

    // Check if user is admin
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const membership = memberships.data.find(m => m.publicUserData?.userId === userId);

    if (!membership || membership.role !== 'org:admin') {
      return ApiErrorHandler.forbidden('Only organization admins can invite members');
    }

    const body = await request.json();
    const result = inviteMemberSchema.safeParse(body);

    if (!result.success) {
      return ApiErrorHandler.badRequest(result.error.issues.map(e => e.message).join(', '));
    }

    const { email, role } = result.data;

    // Check if user is already a member of the organization
    const existingMember = memberships.data.find(m => m.publicUserData?.identifier === email);

    if (existingMember) {
      return ApiErrorHandler.badRequest('User is already a member of this organization');
    }

    // Check if there's already a pending invitation for this email
    const pendingInvitations = await client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ['pending'],
    });

    const existingInvitation = pendingInvitations.data.find(inv => inv.emailAddress === email);

    if (existingInvitation) {
      return ApiErrorHandler.badRequest('An invitation has already been sent to this email');
    }

    // Create invitation via Clerk
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role,
      inviterUserId: userId,
    });

    return NextResponse.json({ data: invitation });
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return ApiErrorHandler.handle(error);
  }
}
