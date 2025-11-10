import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrorHandler.badRequest('Workspace name is required');
    }

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
