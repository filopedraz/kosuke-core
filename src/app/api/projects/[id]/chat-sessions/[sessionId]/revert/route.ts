import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { GitOperations } from '@/lib/github/git-operations';
import { sessionManager } from '@/lib/sessions';
import type { RevertToMessageRequest } from '@/lib/types/chat';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Create a system message in the database
 * Used for revert operation notifications
 */
async function createSystemMessage(
  projectId: number,
  sessionId: string,
  userId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<number> {
  console.log(`💬 Creating system message for session ${sessionId}`);

  // Look up session integer ID from string session ID
  const [session] = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(eq(chatSessions.sessionId, sessionId))
    .limit(1);

  if (!session) {
    throw new Error(`Chat session not found: ${sessionId}`);
  }

  // Create system message in database
  const [savedMessage] = await db
    .insert(chatMessages)
    .values({
      projectId,
      userId,
      content,
      role: 'system',
      modelType: 'system',
      chatSessionId: session.id,
      metadata: metadata || null,
    })
    .returning();

  console.log(`✅ System message saved: ${savedMessage.id}`);

  return savedMessage.id;
}

/**
 * POST /api/projects/[id]/chat-sessions/[sessionId]/revert
 * Revert session to a specific commit SHA
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = parseInt(id);
    const sessionIdNumber = parseInt(sessionId);

    if (isNaN(projectId) || isNaN(sessionIdNumber)) {
      return ApiErrorHandler.badRequest('Invalid project or session ID');
    }

    const body: RevertToMessageRequest = await request.json();

    // Get project and verify ownership
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // Verify the message exists and belongs to this session
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.id, body.message_id),
          eq(chatMessages.projectId, projectId),
          eq(chatMessages.chatSessionId, sessionIdNumber)
        )
      )
      .limit(1);

    if (!message || !message.commitSha) {
      return ApiErrorHandler.notFound('Message not found or no commit associated');
    }

    // Get session info
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionIdNumber))
      .limit(1);

    if (!session) {
      return ApiErrorHandler.notFound('Chat session not found');
    }

    console.log(
      `🔄 Reverting project ${projectId} session ${session.sessionId} to commit ${message.commitSha.substring(0, 8)}`
    );

    // Get user's GitHub token (required for pushing to remote)
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return ApiErrorHandler.badRequest('GitHub not connected');
    }

    // Get session path
    const sessionPath = sessionManager.getSessionPath(projectId, session.sessionId);

    // Perform git revert operation (reset + force push to remote)
    const gitOps = new GitOperations();
    const success = await gitOps.revertToCommit(sessionPath, message.commitSha, githubToken);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to revert to commit', details: 'Git revert operation failed' },
        { status: 400 }
      );
    }

    console.log(`✅ Successfully reverted to commit ${message.commitSha.substring(0, 8)}`);

    // Create system message to notify about the revert
    try {
      await createSystemMessage(
        projectId,
        session.sessionId,
        userId,
        'Project restored to the state when this assistant message was created',
        {
          revertInfo: {
            commitSha: message.commitSha,
            revertedAt: new Date().toISOString(),
            messageId: body.message_id,
          },
        }
      );
      console.log(`✅ Sent revert system message for session ${session.sessionId}`);
    } catch (systemMessageError) {
      console.warn('Failed to create revert system message:', systemMessageError);
      // Don't fail the revert operation if system message fails
    }

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        reverted_to_commit: message.commitSha,
        message: `Reverted to commit ${message.commitSha.slice(0, 7)}`,
      },
    });
  } catch (error) {
    console.error('Error reverting to message:', error);
    return ApiErrorHandler.serverError(error);
  }
}
