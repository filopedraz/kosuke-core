import { ApiErrorHandler } from '@/lib/api/errors';
import { getUserOrganizations } from '@/lib/organizations';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const organizations = await getUserOrganizations(userId);
    return NextResponse.json({ data: organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return ApiErrorHandler.handle(error);
  }
}
