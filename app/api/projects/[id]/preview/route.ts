import { getSession } from '@/lib/auth/session';
import { getProjectById } from '@/lib/db/projects';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects/[id]/preview
 * Get the preview URL for a project (proxied to Python agent)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    console.log(`[Preview API] GET request for project ${projectId}`);

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      console.log(`[Preview API] Project ${projectId} not found`);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to the project
    if (project.createdBy !== session.user.id) {
      console.log(`[Preview API] User ${session.user.id} does not have access to project ${projectId}`);
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Proxy request to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/preview/status/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Preview API] Agent error: ${error}`);
      return NextResponse.json(
        { error: 'Failed to get preview status', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`[Preview API] Returning preview status for project ${projectId}`, result);

    // Transform the response to match frontend expectations
    const transformedResult = {
      ...result,
      previewUrl: result.url || null, // Map 'url' to 'previewUrl' for frontend compatibility
    };

    return NextResponse.json(transformedResult);
  } catch (error: unknown) {
    console.error('[Preview API] Error getting preview URL:', error);

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
 * POST /api/projects/[id]/preview
 * Start a preview for a project (proxied to Python agent)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to the project
    if (project.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Proxy request to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/preview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        env_vars: {}, // TODO: Add environment variables from database
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Preview API] Agent error: ${error}`);
      return NextResponse.json(
        { error: 'Failed to start preview', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error starting preview:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/preview
 * Stop a preview for a project (proxied to Python agent)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to the project
    if (project.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Proxy request to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/preview/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project_id: projectId }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Preview API] Agent error: ${error}`);
      return NextResponse.json(
        { error: 'Failed to stop preview', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error stopping preview:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
