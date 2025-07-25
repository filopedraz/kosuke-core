import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProjectById } from '@/lib/db/projects';

/**
 * GET /api/projects/[id]/preview/status
 * Check the status of a project preview (proxied to Python agent)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const projectId = Number(params.id);
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
    const response = await fetch(`${agentUrl}/api/preview/status/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Preview Status API] Agent error: ${error}`);
      return NextResponse.json(
        { error: 'Failed to get preview status', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error getting preview status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 