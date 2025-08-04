import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { disconnectGitHub } from '@/lib/github/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await disconnectGitHub(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}