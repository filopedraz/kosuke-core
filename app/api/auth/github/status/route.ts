import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserGitHubInfo } from '@/lib/github/auth';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const githubInfo = await getUserGitHubInfo(userId);

    return NextResponse.json({
      connected: !!githubInfo,
      ...githubInfo,
    });
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}