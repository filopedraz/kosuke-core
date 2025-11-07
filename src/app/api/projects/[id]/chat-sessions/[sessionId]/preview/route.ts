import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { getProjectEnvironmentVariables } from '@/lib/db/queries';
import { chatSessions, projects } from '@/lib/db/schema';
import { getDockerService } from '@/lib/docker';
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

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    // Get the project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return ApiErrorHandler.projectNotFound();
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
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

    // Use singleton DockerService instance
    const dockerService = getDockerService();
    const status = await dockerService.getPreviewStatus(projectId, sessionId);

    // If container is not running, automatically start it
    if (!status.running && status.url === null) {
      try {
        console.log('Container is not running, starting preview...');
        // Fetch environment variables for the project
        const envVars = await getProjectEnvironmentVariables(projectId);

        // Start preview
        const url = await dockerService.startPreview(
          projectId,
          sessionId,
          envVars,
          userId,
          project.defaultBranch || 'main'
        );

        // Get updated status
        const updatedStatus = await dockerService.getPreviewStatus(projectId, sessionId);

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

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    // Get the project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return ApiErrorHandler.projectNotFound();
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // If this is the default branch, allow starting preview without a chat session record
    const isDefaultBranchSession = sessionId === project.defaultBranch;
    if (!isDefaultBranchSession) {
      const sessionQueryStart = performance.now();
      const [session] = await db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.projectId, projectId),
            eq(chatSessions.sessionId, sessionId)
          )
        );
      const sessionQueryTime = performance.now() - sessionQueryStart;
      console.log(`⏱️  [Preview POST] Session DB query took ${sessionQueryTime.toFixed(2)}ms`);

      if (!session) {
        return ApiErrorHandler.chatSessionNotFound();
      }
    }

    // Fetch environment variables for the project
    const envVarsStart = performance.now();
    const envVars = await getProjectEnvironmentVariables(projectId);
    const envVarsTime = performance.now() - envVarsStart;
    console.log(`⏱️  [Preview POST] getProjectEnvironmentVariables took ${envVarsTime.toFixed(2)}ms`);

    // Start preview using singleton DockerService instance
    const dockerService = getDockerService();
    const url = await dockerService.startPreview(
      projectId,
      sessionId,
      envVars,
      userId,
      project.defaultBranch || 'main'
    );

    // Get status to check if responding
    const status = await dockerService.getPreviewStatus(projectId, sessionId);

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
