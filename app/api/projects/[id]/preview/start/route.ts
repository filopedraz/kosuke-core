import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = Number(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    console.log(`[Preview Start API] POST request for project ${projectId}`);

    // Get the project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      console.log(`[Preview Start API] Project ${projectId} not found`);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      console.log(`[Preview Start API] User ${userId} does not have access to project ${projectId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      console.error(`[Preview Start API] Agent error: ${error}`);
      return NextResponse.json(
        { error: 'Failed to start preview', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log(`[Preview Start API] Successfully started preview for project ${projectId}`, result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Preview Start API] Error starting preview:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
