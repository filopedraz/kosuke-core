import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';

const createPersonalWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Workspace name too long'),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const body = await request.json();
    const result = createPersonalWorkspaceSchema.safeParse(body);

    if (!result.success) {
      return ApiErrorHandler.badRequest(result.error.issues.map(e => e.message).join(', '));
    }

    const { name } = result.data;

    const clerk = await clerkClient();

    // Check if user already has a personal organization
    const memberships = await clerk.users.getOrganizationMembershipList({ userId });
    const existingPersonalOrg = memberships.data.find(
      membership => membership.organization.publicMetadata?.isPersonal === true
    );

    if (existingPersonalOrg) {
      // User already has a personal org, just return success
      return NextResponse.json({ success: true });
    }

    // Create personal organization with constraints
    const personalOrg = await clerk.organizations.createOrganization({
      name: name.trim(),
      createdBy: userId,
      maxAllowedMemberships: 1,
      publicMetadata: {
        isPersonal: true,
      },
    });

    console.log(`✅ Created personal workspace for user: ${personalOrg.id} (${personalOrg.name})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating personal organization:', error);
    return ApiErrorHandler.handle(error);
  }
}
