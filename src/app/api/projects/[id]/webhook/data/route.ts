import { NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, projects } from '@/lib/db/schema';
import type { WebhookAssistantData } from '@/lib/types';
import type { GitHubCommitData, GitHubSessionSummary } from '@/lib/types/github';

interface SystemMessageData {
  content: string;
  chatSessionId: string | number;
  revertInfo?: {
    messageId: number;
    commitSha: string;
    timestamp: string;
  };
}

interface CompletionLogData {
  success: boolean;
  totalActions: number;
  duration: string;
  github?: {
    commit: {
      sha: string;
      message: string;
      filesChanged: number;
    };
  };
  session?: {
    sessionId: string;
    filesChanged: number;
    status: string;
    duration?: string;
  };
}

interface CompletionResponse {
  success: boolean;
  projectId: string;
  timestamp: string;
  github?: {
    commit?: {
      sha: string;
      message: string;
      filesChanged: number;
    };
    session?: {
      sessionId: string;
      filesChanged: number;
      status: string;
    };
  };
}

// Webhook authentication
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret-change-in-production';

// Webhook request schema - discriminated union
type WebhookRequest =
  | {
      type: 'assistant_message';
      data: WebhookAssistantData;
    }
  | {
      type: 'completion';
      data: WebhookAssistantData & {
        success?: boolean;
        totalActions?: number;
        duration?: number;
        githubCommit?: GitHubCommitData;
        sessionSummary?: GitHubSessionSummary;
      };
    }
  | {
      type: 'system_message';
      data: SystemMessageData;
    };

/**
 * Unified webhook endpoint for Python service to save assistant data
 * POST /api/projects/[id]/webhook/data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify webhook authentication
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${WEBHOOK_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.error('Webhook authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = id;

    // Verify project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse request body
    const webhookData: WebhookRequest = await request.json();

    if (!webhookData.type) {
      return NextResponse.json({ error: 'Webhook type is required' }, { status: 400 });
    }

    console.log(`📦 Webhook: Received ${webhookData.type} for project ${projectId}`);

    // Handle different webhook types
    switch (webhookData.type) {
      case 'assistant_message':
        return await handleAssistantMessage(projectId, project.createdBy, webhookData.data);

      case 'completion':
        return await handleCompletion(projectId, webhookData.data);

      case 'system_message':
        return await handleSystemMessage(projectId, project.createdBy, webhookData.data);

      default:
        return NextResponse.json({
          error: `Unknown webhook type: ${(webhookData as { type: string }).type}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in unified webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * Handle saving assistant message with blocks
 */
async function handleAssistantMessage(
  projectId: string,
  userId: string,
  data: WebhookAssistantData
): Promise<NextResponse> {
  try {
    if (!data.content && !data.blocks) {
      return NextResponse.json({
        error: 'Either content or blocks must be provided'
      }, { status: 400 });
    }

    // Save or update assistant message to database
    let savedMessage;

    if (data.assistantMessageId) {
      // Update existing assistant message placeholder
      const [updatedMessage] = await db.update(chatMessages)
        .set({
          content: data.content || null, // Simple text content
          blocks: data.blocks || null, // Assistant response blocks as JSON
          tokensInput: data.tokensInput || 0,
          tokensOutput: data.tokensOutput || 0,
          contextTokens: data.contextTokens || 0,
          commitSha: data.commitSha || null, // Git commit SHA for revert functionality
        })
        .where(eq(chatMessages.id, data.assistantMessageId))
        .returning();

      savedMessage = updatedMessage;
      console.log(`✅ Updated existing assistant message ${data.assistantMessageId}`);
    } else {
      // Create new assistant message (fallback for backward compatibility)
      if (!data.chatSessionId) {
        return NextResponse.json({
          error: 'chatSessionId is required for creating new assistant messages'
        }, { status: 400 });
      }

      const [newMessage] = await db.insert(chatMessages).values({
        projectId,
        userId,
        content: data.content || null, // Simple text content
        blocks: data.blocks || null, // Assistant response blocks as JSON
        role: 'assistant',
        modelType: 'premium',
        chatSessionId: data.chatSessionId,
        tokensInput: data.tokensInput || 0,
        tokensOutput: data.tokensOutput || 0,
        contextTokens: data.contextTokens || 0,
        commitSha: data.commitSha || null, // Git commit SHA for revert functionality
      }).returning();

      savedMessage = newMessage;
      console.log(`✅ Created new assistant message ${savedMessage.id}`);
    }

    const blockCount = data.blocks?.length || 0;
    const hasThinking = data.blocks?.some(block => block.type === 'thinking') || false;
    const hasTools = data.blocks?.some(block => block.type === 'tool') || false;

    console.log(`✅ Webhook: Saved assistant message ${savedMessage.id} for project ${projectId}`, {
      blockCount,
      hasThinking,
      hasTools,
      tokens: {
        input: data.tokensInput,
        output: data.tokensOutput,
        context: data.contextTokens
      }
    });

    return NextResponse.json({
      success: true,
      messageId: savedMessage.id,
      timestamp: savedMessage.timestamp,
      blockCount,
    });

  } catch (error) {
    console.error('Error saving assistant message:', error);
    return NextResponse.json(
      { error: 'Failed to save assistant message' },
      { status: 500 }
    );
  }
}

/**
 * Handle completion event (for logging and future features)
 */
async function handleCompletion(
  projectId: string,
  data: WebhookAssistantData & {
    success?: boolean;
    totalActions?: number;
    duration?: number;
    githubCommit?: GitHubCommitData;
    sessionSummary?: GitHubSessionSummary;
  }
): Promise<NextResponse> {
  try {
    const {
      success = true,
      totalActions = 0,
      duration = 0,
      githubCommit,
      sessionSummary,
    } = data;

    const logData: CompletionLogData = {
      success,
      totalActions,
      duration: `${duration}ms`,
    };

    // Add GitHub information to logs if available
    if (githubCommit) {
      logData.github = {
        commit: {
          sha: githubCommit.sha.substring(0, 8),
          message: githubCommit.message,
          filesChanged: githubCommit.files_changed,
        },
      };
    }

    if (sessionSummary) {
      logData.session = {
        sessionId: sessionSummary.session_id,
        filesChanged: sessionSummary.files_changed,
        status: sessionSummary.status,
        duration: sessionSummary.duration ? `${sessionSummary.duration}s` : undefined,
      };
    }

    console.log(`✅ Webhook: Chat session completed for project ${projectId}`, logData);

    // Return success - this endpoint is mainly for logging and potential future features
    const response: CompletionResponse = {
      success: true,
      projectId,
      timestamp: new Date().toISOString(),
    };

    // Include GitHub data in response if available
    if (githubCommit || sessionSummary) {
      response.github = {
        commit: githubCommit ? {
          sha: githubCommit.sha,
          message: githubCommit.message,
          filesChanged: githubCommit.files_changed,
        } : undefined,
        session: sessionSummary ? {
          sessionId: sessionSummary.session_id,
          filesChanged: sessionSummary.files_changed,
          status: sessionSummary.status,
        } : undefined,
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error handling completion:', error);
    return NextResponse.json(
      { error: 'Failed to handle completion' },
      { status: 500 }
    );
  }
}

/**
 * Handle saving system message (e.g., revert notifications)
 */
async function handleSystemMessage(
  projectId: string,
  userId: string,
  data: SystemMessageData
): Promise<NextResponse> {
  try {
    if (!data.content || !data.chatSessionId) {
      return NextResponse.json({
        error: 'Content and chatSessionId are required for system messages'
      }, { status: 400 });
    }

    // If chatSessionId is a string, look up the integer ID
    let sessionIntId: string;
    if (typeof data.chatSessionId === 'string') {
      // Look up session by sessionId string
      const [session] = await db
        .select({ id: chatSessions.id })
        .from(chatSessions)
        .where(eq(chatSessions.sessionId, data.chatSessionId))
        .limit(1);

      if (!session) {
        return NextResponse.json({
          error: `Chat session not found: ${data.chatSessionId}`
        }, { status: 404 });
      }

      sessionIntId = session.id;
    } else {
      sessionIntId = String(data.chatSessionId);
    }

    // Create system message in database
    const [savedMessage] = await db.insert(chatMessages).values({
      projectId,
      userId,
      content: data.content,
      role: 'system',
      modelType: 'system',
      chatSessionId: sessionIntId,
      // Store revert info as metadata in a JSON field if available
      metadata: data.revertInfo ? { revertInfo: data.revertInfo } : null,
    }).returning();

    console.log(`✅ System message saved: ${savedMessage.id}`);

    return NextResponse.json({
      success: true,
      messageId: savedMessage.id,
      content: savedMessage.content,
    });

  } catch (error) {
    console.error('Error saving system message:', error);
    return NextResponse.json(
      { error: 'Failed to save system message' },
      { status: 500 }
    );
  }
}
