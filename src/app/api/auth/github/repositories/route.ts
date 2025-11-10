import type { ApiResponse } from '@/lib/api';
import { ApiErrorHandler } from '@/lib/api/errors';
import { listUserRepositories } from '@/lib/github';
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
    const search = searchParams.get('search') || '';

    const { repositories, hasMore } = await listUserRepositories(userId, page, perPage, search);

    return NextResponse.json<ApiResponse<{ repositories: typeof repositories; hasMore: boolean }>>({
      data: { repositories, hasMore },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    return ApiErrorHandler.handle(error);
  }
}
