import type { ApiResponse } from '@/lib/api';
import { listUserRepositories } from '@/lib/github';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const repositories = await listUserRepositories(userId);

    return NextResponse.json<ApiResponse<{ repositories: typeof repositories }>>({
      data: { repositories },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
