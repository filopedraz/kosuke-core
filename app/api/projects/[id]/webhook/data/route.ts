import { NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { chatMessages, projects } from '@/lib/db/schema';
import type { WebhookAssistantData } from '@/lib/types';

// Webhook authentication
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret-change-in-production';

// Webhook request schema
interface WebhookRequest {
  type: 'assistant_message' | 'completion';
  data: WebhookAssistantData & {
    // For completion events
    success?: boolean;
    totalActions?: number;
    duration?: number;
  };
}

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
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

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

      default:
        return NextResponse.json({
          error: `Unknown webhook type: ${webhookData.type}`
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
  projectId: number,
  userId: number,
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
        })
        .where(eq(chatMessages.id, data.assistantMessageId))
        .returning();

      savedMessage = updatedMessage;
      console.log(`✅ Updated existing assistant message ${data.assistantMessageId}`);
    } else {
      // Create new assistant message (fallback for backward compatibility)
      const [newMessage] = await db.insert(chatMessages).values({
        projectId,
        userId,
        content: data.content || null, // Simple text content
        blocks: data.blocks || null, // Assistant response blocks as JSON
        role: 'assistant',
        modelType: 'premium',
        tokensInput: data.tokensInput || 0,
        tokensOutput: data.tokensOutput || 0,
        contextTokens: data.contextTokens || 0,
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
  projectId: number,
  data: WebhookAssistantData & { success?: boolean; totalActions?: number; duration?: number }
): Promise<NextResponse> {
  try {
    const {
      success = true,
      totalActions = 0,
      duration = 0,
    } = data;

    console.log(`✅ Webhook: Chat session completed for project ${projectId}`, {
      success,
      totalActions,
      duration: `${duration}ms`,
    });

    // Return success - this endpoint is mainly for logging and potential future features
    return NextResponse.json({
      success: true,
      projectId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error handling completion:', error);
    return NextResponse.json(
      { error: 'Failed to handle completion' },
      { status: 500 }
    );
  }
}
