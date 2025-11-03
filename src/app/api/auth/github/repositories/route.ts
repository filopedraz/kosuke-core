import type { ApiResponse } from '@/lib/api';
import { ApiErrorHandler } from '@/lib/api/errors';
import { listUserRepositories } from '@/lib/github';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const repositories = await listUserRepositories(userId);

    return NextResponse.json<ApiResponse<{ repositories: typeof repositories }>>({
      data: { repositories },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    return ApiErrorHandler.handle(error);
  }
}
