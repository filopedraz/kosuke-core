import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions } from '@/lib/db/schema';
import type { RevertToMessageRequest } from '@/lib/types/chat';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, sessionId } = await params;

    const projectId = parseInt(id);
    const sessionIdNumber = parseInt(sessionId);
    const body: RevertToMessageRequest = await request.json();

    // Verify the message exists and belongs to this session
    const message = await db
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

    if (!message[0] || !message[0].commitSha) {
      return NextResponse.json(
        { error: 'Message not found or no commit associated' },
        { status: 404 }
      );
    }

    // Get session info for branch name
    const session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionIdNumber))
      .limit(1);

    if (!session[0]) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Send revert request to agent service
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/revert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        session_id: session[0].sessionId,
        commit_sha: message[0].commitSha,
        message_id: body.message_id,
        create_backup: body.create_backup_commit || false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to revert', details: error },
        { status: response.status }
      );
    }

    await response.json();
    return NextResponse.json({
      success: true,
      data: {
        success: true,
        reverted_to_commit: message[0].commitSha,
        message: `Reverted to commit ${message[0].commitSha?.slice(0, 7)}`,
      },
    });
  } catch (error) {
    console.error('Error reverting to message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
