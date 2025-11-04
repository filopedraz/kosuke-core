import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, projects } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
/**
 * GET /api/projects/[id]/chat-sessions/[sessionId]/messages
 * Get messages for a specific chat session
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

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return ApiErrorHandler.projectNotFound();
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
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
      return ApiErrorHandler.chatSessionNotFound();
    }

    // Get messages for the chat session
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.chatSessionId, session.id))
      .orderBy(asc(chatMessages.timestamp));

    return NextResponse.json({
      messages,
      sessionInfo: {
        id: session.id,
        sessionId: session.sessionId,
        title: session.title,
        status: session.status,
        messageCount: messages.length,
      },
    });
  } catch (error) {
    console.error('Error getting chat session messages:', error);
    return ApiErrorHandler.handle(error);
  }
}
