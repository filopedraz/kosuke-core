import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { getProjectEnvironmentVariables } from '@/lib/db/queries';
import { chatSessions } from '@/lib/db/schema';
import { getPreviewService } from '@/lib/docker';
import { verifyProjectAccess } from '@/lib/projects';
import { and, eq } from 'drizzle-orm';
/**
 * GET /api/projects/[id]/chat-sessions/[sessionId]/preview
 * Get the preview URL for a project session
 * Automatically starts the preview if it's not running
 */
export async function GET(
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

    // If this is the default branch, allow preview without a chat session record
    const isDefaultBranchSession = sessionId === (project.defaultBranch || 'main');
    if (!isDefaultBranchSession) {
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
        return ApiErrorHandler.chatSessionNotFound();
      }
    }

    // Use singleton PreviewService instance
    const previewService = getPreviewService();
    const status = await previewService.getPreviewStatus(projectId, sessionId);

    // If container is not running, automatically start it
    if (!status.running && status.url === null) {
      try {
        console.log('Container is not running, starting preview...');
        // Fetch user-defined environment variables for the project
        const envVars = await getProjectEnvironmentVariables(projectId);

        // Start preview
        const url = await previewService.startPreview(
          projectId,
          sessionId,
          envVars,
          userId
        );

        // Get updated status
        const updatedStatus = await previewService.getPreviewStatus(projectId, sessionId);

        // Return the started container info
        return NextResponse.json({
          success: true,
          url,
          project_id: projectId,
          session_id: sessionId,
          running: updatedStatus.running,
          is_responding: updatedStatus.is_responding,
          previewUrl: url,
        });
      } catch (startError) {
        return ApiErrorHandler.handle(startError);
      }
    }

    // Container is already running, return status
    return NextResponse.json({
      ...status,
      previewUrl: status.url || null, // Map 'url' to 'previewUrl' for frontend compatibility
    });
  } catch (error: unknown) {
    console.error('Error in preview GET:', error);
    return ApiErrorHandler.handle(error);
  }
}

/**
 * POST /api/projects/[id]/chat-sessions/[sessionId]/preview
 * Start a preview for a project session
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

    // If this is the default branch, allow starting preview without a chat session record
    const isDefaultBranchSession = sessionId === project.defaultBranch;
    if (!isDefaultBranchSession) {
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
        return ApiErrorHandler.chatSessionNotFound();
      }
    }

    // Fetch environment variables for the project
    const envVars = await getProjectEnvironmentVariables(projectId);

    // Start preview using singleton PreviewService instance
    const previewService = getPreviewService();
    const url = await previewService.startPreview(
      projectId,
      sessionId,
      envVars,
      userId
    );

    // Get status to check if responding
    const status = await previewService.getPreviewStatus(projectId, sessionId);

    // Transform result to match expected response format
    return NextResponse.json({
      success: true,
      url: url || null,
      status: status.is_responding ? 'running' : 'starting',
      error: null,
    });
  } catch (error: unknown) {
    console.error('Error in preview POST:', error);
    return ApiErrorHandler.handle(error);
  }
}
