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
    const { repository_url } = await request.json();

    // Get user's GitHub token
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // First get repo info
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const infoResponse = await fetch(
      `${agentUrl}/api/github/repo-info?repo_url=${encodeURIComponent(repository_url)}`,
      {
        headers: {
          'X-GitHub-Token': githubToken,
        },
      }
    );

    if (!infoResponse.ok) {
      return NextResponse.json({ error: 'Invalid repository URL' }, { status: 400 });
    }

    const repoInfo = await infoResponse.json();

    // Import repository
    const importResponse = await fetch(`${agentUrl}/api/github/import-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify({
        repo_url: repository_url,
        project_id: projectId,
      }),
    });

    if (!importResponse.ok) {
      const error = await importResponse.text();
      return NextResponse.json(
        { error: 'Failed to import repository', details: error },
        { status: importResponse.status }
      );
    }

    // Update project with GitHub info
    await db
      .update(projects)
      .set({
        githubRepoUrl: repository_url,
        githubOwner: repoInfo.owner,
        githubRepoName: repoInfo.name,
        lastGithubSync: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({
      data: { success: true, repo_info: repoInfo },
    });
  } catch (error) {
    console.error('Error importing GitHub repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}