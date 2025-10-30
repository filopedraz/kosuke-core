import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { getDockerService } from '@/lib/docker';
import { getGitHubToken } from '@/lib/github/auth';
import { sessionManager } from '@/lib/sessions';
import { eq } from 'drizzle-orm';

/**
 * POST /api/projects/[id]/chat-sessions/[sessionId]/pull
 * Pull latest changes for session branch from remote
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.badRequest('Invalid project ID');
    }

    // Get the project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // Get user's GitHub token (mandatory)
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return ApiErrorHandler.badRequest('GitHub not connected');
    }

    // Pull session branch using SessionManager
    console.log(`Pulling session branch for project ${projectId} session ${sessionId}`);
    const pullResult = await sessionManager.pullSessionBranch(projectId, sessionId, githubToken);

    if (!pullResult.success) {
      return NextResponse.json(
        { error: 'Failed to pull changes', details: pullResult.message },
        { status: 500 }
      );
    }

    // Check if we need to restart the container to apply changes
    let containerRestarted = false;
    if (pullResult.changed && pullResult.commits_pulled > 0) {
      try {
        const dockerService = getDockerService();
        const isRunning = await dockerService.isContainerRunning(projectId, sessionId);

        if (isRunning) {
          console.log(`Restarting container to apply ${pullResult.commits_pulled} new commit(s)`);
          await dockerService.restartPreviewContainer(projectId, sessionId);
          containerRestarted = true;
          console.log('✅ Container restarted successfully');
        }
      } catch (restartError) {
        // Log but don't fail - pull was successful
        console.error('Failed to restart container after pull:', restartError);
      }
    }

    // Return response in expected format
    return NextResponse.json({
      success: true,
      container_restarted: containerRestarted,
      pullResult: {
        changed: pullResult.changed,
        commitsPulled: pullResult.commits_pulled,
        message: pullResult.message,
        previousCommit: pullResult.previous_commit || null,
        newCommit: pullResult.new_commit || null,
        branchName: pullResult.branch_name,
      },
    });
  } catch (error: unknown) {
    console.error('Error in session pull endpoint:', error);
    return ApiErrorHandler.serverError(error);
  }
}
