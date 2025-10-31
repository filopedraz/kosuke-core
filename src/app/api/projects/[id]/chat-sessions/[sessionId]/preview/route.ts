import { NextRequest, NextResponse } from 'next/server';

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

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
        return NextResponse.json(
          { error: 'Chat session not found' },
          { status: 404 }
        );
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
          userId
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
        return NextResponse.json(
          { error: 'Failed to start preview container', details: String(startError) },
          { status: 500 }
        );
      }
    }

    // Container is already running, return status
    return NextResponse.json({
      ...status,
      previewUrl: status.url || null, // Map 'url' to 'previewUrl' for frontend compatibility
    });
  } catch (error: unknown) {
    // Return a more detailed error message
    const errorMessage = error instanceof Error ?
      `${error.message}\n${error.stack}` :
      String(error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: errorMessage
      },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

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
        return NextResponse.json(
          { error: 'Chat session not found' },
          { status: 404 }
        );
      }
    }

    // Fetch environment variables for the project
    const envVars = await getProjectEnvironmentVariables(projectId);

    // Start preview using singleton DockerService instance
    const dockerService = getDockerService();
    const url = await dockerService.startPreview(
      projectId,
      sessionId,
      envVars,
      userId
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
    const errorMessage = error instanceof Error ?
      `${error.message}\n${error.stack}` :
      String(error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
