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
      return ApiErrorHandler.badRequest('Organization name is required');
    }

    // Create organization via Clerk
    const clerk = await clerkClient();
    const clerkOrg = await clerk.organizations.createOrganization({
      name: name.trim(),
      createdBy: userId,
      publicMetadata: {
        isPersonal: false,
      },
    });

    // Organization will be synced to DB via webhook
    // Return the Clerk org ID for immediate use
    return NextResponse.json({
      data: {
        clerkOrgId: clerkOrg.id,
        name: clerkOrg.name,
        slug: clerkOrg.slug,
      },
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    return ApiErrorHandler.handle(error);
  }
}
