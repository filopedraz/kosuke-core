import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions } from '@/lib/db/schema';
import { verifyProjectAccess } from '@/lib/projects';
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

    const { id: projectId, sessionId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
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
