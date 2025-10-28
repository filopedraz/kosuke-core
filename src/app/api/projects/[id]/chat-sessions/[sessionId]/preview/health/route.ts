import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatSessions, projects } from '@/lib/db/schema';
import { getDockerService } from '@/lib/docker';
import { and, eq } from 'drizzle-orm';

/**
 * GET /api/projects/[id]/chat-sessions/[sessionId]/preview/health
 * Check if the preview container is healthy and responding
 *
 * This performs a server-side health check of the container within the Docker network,
 * avoiding CORS/browser limitations.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ ok: false, error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
    }

    if (project.createdBy !== userId) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // If this is the default branch, allow health check without a chat session record
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
        return NextResponse.json({ ok: false, error: 'Chat session not found' }, { status: 404 });
      }
    }

    // Get Docker service and check container status
    const dockerService = getDockerService();
    const status = await dockerService.getPreviewStatus(projectId, sessionId);

    // Return health status
    // ok = container is running AND responding
    return NextResponse.json({
      ok: status.running && status.is_responding,
      running: status.running,
      is_responding: status.is_responding,
      url: status.url,
    });
  } catch (error) {
    console.error('Error checking preview health:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

