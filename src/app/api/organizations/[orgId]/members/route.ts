import { ApiErrorHandler } from '@/lib/api/errors';
import { getOrganizationMembers } from '@/lib/organizations';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId } = await params;

    const members = await getOrganizationMembers(orgId);
    return NextResponse.json({ data: members });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return ApiErrorHandler.handle(error);
  }
}
