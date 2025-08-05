import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/server';
import { AGENT_SERVICE_URL } from '@/lib/constants';
import { db } from '@/lib/db/drizzle';
import { chatSessions, projects } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * GET /api/projects/[id]/chat-sessions/[sessionId]/preview
 * Get the preview URL for a project session (proxied to Python agent)
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

    // Proxy request to Python agent
    const response = await fetch(`${AGENT_SERVICE_URL}/api/preview/status/${projectId}/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to get preview status', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();

    // If container is not running, automatically start it
    if (!result.running && result.url === null) {
      try {
        const startResponse = await fetch(`${AGENT_SERVICE_URL}/api/preview/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            session_id: sessionId,
            env_vars: {}, // TODO: Add environment variables from database
          }),
        });

        if (!startResponse.ok) {
          const startError = await startResponse.text();
          return NextResponse.json(
            { error: 'Failed to start preview container', details: startError },
            { status: startResponse.status }
          );
        }

        const startResult = await startResponse.json();

        // Return the started container info
        const transformedResult = {
          ...startResult,
          previewUrl: startResult.url || null,
        };

        return NextResponse.json(transformedResult);
      } catch (startError) {
        return NextResponse.json(
          { error: 'Failed to start preview container', details: String(startError) },
          { status: 500 }
        );
      }
    }

    // Container is already running, return status
    const transformedResult = {
      ...result,
      previewUrl: result.url || null, // Map 'url' to 'previewUrl' for frontend compatibility
    };

    return NextResponse.json(transformedResult);
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
 * Start a preview for a project session (proxied to Python agent)
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

    // Start preview via Python agent
    const response = await fetch(`${AGENT_SERVICE_URL}/api/preview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        session_id: sessionId,
        env_vars: {}, // TODO: Add environment variables from database
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to start preview', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Transform result to match expected response format
    const transformedResult = {
      success: true,
      url: result.url || null,
      status: result.status || 'starting',
      error: result.error || null,
    };

    return NextResponse.json(transformedResult);
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

/**
 * DELETE /api/projects/[id]/chat-sessions/[sessionId]/preview
 * Stop a preview for a project session (proxied to Python agent)
 */
export async function DELETE(
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

    // Proxy request to Python agent
    const response = await fetch(`${AGENT_SERVICE_URL}/api/preview/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to stop preview', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
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
