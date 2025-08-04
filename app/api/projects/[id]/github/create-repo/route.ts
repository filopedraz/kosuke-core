import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGitHubToken } from '@/lib/github/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    // Get user's GitHub token
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/github/create-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to create repository', details: error },
        { status: response.status }
      );
    }

    const repoData = await response.json();

    // Update project with GitHub info
    await db
      .update(projects)
      .set({
        githubRepoUrl: repoData.url,
        githubOwner: repoData.owner,
        githubRepoName: repoData.name,
        lastGithubSync: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      data: repoData,
    });
  } catch (error) {
    console.error('Error creating GitHub repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}