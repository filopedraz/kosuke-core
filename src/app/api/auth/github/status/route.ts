import type { ApiResponse } from '@/lib/api';
import {
  getUserGitHubInfo,
  hasRequiredGitHubScopes,
  testGitHubApiConnection,
} from '@/lib/github/auth';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get GitHub account status for the authenticated user
 * Since all users sign up via GitHub, this should always return connected: true
 */
export async function GET(_: NextRequest) {
  try {
    const authResult = await auth();
    const userId = authResult?.userId;

    console.log('GitHub status check - Auth result:', { userId, hasAuth: !!authResult });

    if (!userId) {
      console.warn('No userId found in auth result');
      return NextResponse.json({ error: 'Unauthorized - No user session found' }, { status: 401 });
    }

    console.log(`Loading GitHub info for user: ${userId}`);

    // Test GitHub API connection and get detailed information
    const apiTest = await testGitHubApiConnection(userId);
    console.log('GitHub API test result:', apiTest);

    const githubInfo = await getUserGitHubInfo(userId);
    const hasValidScopes = await hasRequiredGitHubScopes(userId);

    // For GitHub-only signup, this should always be true
    const isConnected = !!githubInfo && apiTest.success;

    if (!isConnected) {
      // This should rarely happen with GitHub-only signup
      console.warn(`User ${userId} has no GitHub connection - unexpected with GitHub-only signup`);
      console.warn('API test error:', apiTest.error);
    }

    console.log('GitHub status result:', {
      connected: isConnected,
      hasValidScopes,
      username: githubInfo?.githubUsername,
      apiConnected: apiTest.success,
    });

    return NextResponse.json<
      ApiResponse<{
        connected: boolean;
        hasValidScopes: boolean;
        apiConnected: boolean;
        githubUsername?: string;
        githubId?: string;
        connectedAt?: Date;
      }>
    >({
      data: {
        connected: isConnected,
        hasValidScopes,
        apiConnected: apiTest.success,
        ...githubInfo,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
