import type { ApiResponse } from '@/lib/api';
import { ApiErrorHandler } from '@/lib/api/errors';
import { listUserOrganizations } from '@/lib/github';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '10', 10);

    const { organizations, hasMore } = await listUserOrganizations(userId, page, perPage);

    return NextResponse.json<
      ApiResponse<{ organizations: typeof organizations; hasMore: boolean }>
    >({
      data: { organizations, hasMore },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching GitHub organizations:', error);
    return ApiErrorHandler.handle(error);
  }
}
