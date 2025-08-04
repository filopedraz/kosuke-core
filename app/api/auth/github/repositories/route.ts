import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGitHubToken } from '@/lib/github/auth';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's GitHub token
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // Fetch repositories from GitHub API
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch repositories' },
        { status: response.status }
      );
    }

    const repositories = await response.json();

    return NextResponse.json({
      data: {
        repositories,
      },
    });
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
