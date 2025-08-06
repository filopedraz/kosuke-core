import { auth } from '@/lib/auth/server';
import { AGENT_SERVICE_URL } from '@/lib/constants';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/projects/[id]/pull
 * Pull latest changes for main branch (proxied to Python agent)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
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

    // Parse request body for force parameter
    const body = await request.json().catch(() => ({}));
    const force = body.force || false;

    // Proxy request to Python agent
    const response = await fetch(`${AGENT_SERVICE_URL}/api/preview/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
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
    return NextResponse.json(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in pull endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
