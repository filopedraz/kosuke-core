import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/server';
import { AGENT_SERVICE_URL } from '@/lib/constants';
import { db } from '@/lib/db/drizzle';
import { chatSessions, projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { and, eq } from 'drizzle-orm';

/**
 * POST /api/projects/[id]/chat-sessions/[sessionId]/pull
 * Pull latest changes for session branch (proxied to Python agent)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, sessionId } = await params;
    const projectId = id;

    // Get the project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Verify chat session exists and belongs to project
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.projectId, projectId),
          eq(chatSessions.sessionId, sessionId)
        )
      );

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Parse request body for force parameter
    const body = await request.json().catch(() => ({}));
    const force = body.force || false;

    // Get user's GitHub token (mandatory)
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 400 }
      );
    }

    // Proxy request to Python agent
    const response = await fetch(`${AGENT_SERVICE_URL}/api/preview/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify({
        project_id: projectId,
        session_id: sessionId,
        force: force,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to pull changes', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    // Map backend snake_case to frontend camelCase for compatibility
    const pr = result.pull_request || result.pullResult;
    const mapped = {
      success: !!result.success,
      container_restarted: !!result.container_restarted,
      pullResult: {
        changed: !!pr?.changed,
        commitsPulled: Number(pr?.commits_pulled || 0),
        message: pr?.message || '',
        previousCommit: pr?.previous_commit || null,
        newCommit: pr?.new_commit || null,
        branchName: pr?.branch_name || null,
      },
    } as const;
    return NextResponse.json(mapped);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in session pull endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
