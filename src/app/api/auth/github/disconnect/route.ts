import { disconnectGitHub } from '@/lib/github/auth';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Disconnect GitHub account
 * WARNING: This will effectively sign the user out since GitHub is required for Kosuke
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Disconnect GitHub account from Clerk
    await disconnectGitHub(userId);

    // Since GitHub is required for authentication, this action will:
    // 1. Remove the user's GitHub connection
    // 2. Force them to sign in again (redirect handled on frontend)
    return NextResponse.json({
      data: {
        success: true,
        message: 'GitHub account disconnected. Please sign in again.',
      },
    });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect GitHub account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
