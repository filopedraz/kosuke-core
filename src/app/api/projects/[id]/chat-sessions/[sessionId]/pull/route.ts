import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { getKosukeGitHubToken, getUserGitHubToken } from '@/lib/github/client';
import { getPreviewService } from '@/lib/previews';
import { verifyProjectAccess } from '@/lib/projects';

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

    const { id: projectId, sessionId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess || !project) {
      return ApiErrorHandler.projectNotFound();
    }

    // Get GitHub token based on project ownership (mandatory)
    const kosukeOrg = process.env.NEXT_PUBLIC_GITHUB_WORKSPACE;
    const isKosukeRepo = project.githubOwner === kosukeOrg;

    const githubToken = isKosukeRepo
      ? await getKosukeGitHubToken()
      : await getUserGitHubToken(userId);

    if (!githubToken) {
      return ApiErrorHandler.badRequest('GitHub not connected');
    }

    // Pull session branch using SessionManager
    console.log(`Pulling session branch for project ${projectId} session ${sessionId}`);
    const { sessionManager } = await import('@/lib/sessions');
    const pullResult = await sessionManager.pullSessionBranch(projectId, sessionId, githubToken);

    if (!pullResult.success) {
      return ApiErrorHandler.serverError(new Error(`Failed to pull changes: ${pullResult.message}`));
    }

    // Check if we need to restart the container to apply changes
    let containerRestarted = false;
    if (pullResult.changed && pullResult.commits_pulled > 0) {
      try {
        const previewService = getPreviewService();
        console.log(`Restarting container to apply ${pullResult.commits_pulled} new commit(s)`);
        await previewService.restartPreview(projectId, sessionId);
        containerRestarted = true;
        console.log('✅ Container restarted successfully');
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
