import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { chatSessions } from '@/lib/db/schema';
import { getPreviewService } from '@/lib/previews';
import { verifyProjectAccess } from '@/lib/projects';
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
      return ApiErrorHandler.unauthorized();
    }

    const { id: projectId, sessionId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess || !project) {
      return ApiErrorHandler.projectNotFound();
    }

    // Look up the session (including "main" which is now stored in DB)
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

    // Update lastActivityAt to track preview usage for cleanup job
    await db
      .update(chatSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(chatSessions.id, session.id));

    // Get Preview service and check preview status
    const previewService = getPreviewService();
    const status = await previewService.getPreviewStatus(projectId, sessionId);

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
    return ApiErrorHandler.handle(error);
  }
}

