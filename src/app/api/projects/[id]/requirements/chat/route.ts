import { NextRequest } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, projects } from '@/lib/db/schema';
import { processRequirementsMessage } from '@/lib/requirements/claude-requirements';
import { and, eq } from 'drizzle-orm';

// Schema for sending a requirements message
const sendRequirementsMessageSchema = z.object({
  content: z.string().min(1),
});

/**
 * POST /api/projects/[id]/requirements/chat
 * Send a message in requirements gathering mode using Claude Agent SDK
 * Returns Server-Sent Events (SSE) stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return new Response('Invalid project ID', { status: 400 });
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    if (project.createdBy !== userId) {
      return new Response('Forbidden', { status: 403 });
    }

    // Verify project is in requirements mode
    if (project.status !== 'requirements') {
      return new Response('Project is not in requirements gathering mode', { status: 400 });
    }

    // Get requirements session
    const [requirementsSession] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.projectId, projectId),
          eq(chatSessions.isRequirementsSession, true)
        )
      );

    if (!requirementsSession) {
      return new Response('Requirements session not found', { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const parseResult = sendRequirementsMessageSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response('Invalid request format', { status: 400 });
    }

    const { content: messageContent } = parseResult.data;

    // Save user message to database
    const [userMessage] = await db
      .insert(chatMessages)
      .values({
        projectId,
        chatSessionId: requirementsSession.id,
        userId,
        role: 'user',
        content: messageContent,
        timestamp: new Date(),
      })
      .returning();

    console.log(`✅ User message saved: ${userMessage.id}`);

    // Create assistant message placeholder
    const [assistantMessage] = await db
      .insert(chatMessages)
      .values({
        projectId,
        chatSessionId: requirementsSession.id,
        userId,
        role: 'assistant',
        content: null,
        blocks: [],
        timestamp: new Date(),
      })
      .returning();

    console.log(`✅ Assistant message placeholder created: ${assistantMessage.id}`);

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullTextContent = '';
          const toolBlocks: Array<{ type: string; content: string; name?: string }> = [];

          // Process message with streaming from Claude
          for await (const event of processRequirementsMessage(projectId, messageContent)) {
            if (event.type === 'text_delta') {
              // Stream text token by token
              fullTextContent += event.text || '';

              const data = JSON.stringify({
                type: 'text_delta',
                text: event.text,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } else if (event.type === 'thinking_delta') {
              // Stream thinking token by token
              const data = JSON.stringify({
                type: 'thinking_delta',
                thinking: event.thinking,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } else if (event.type === 'tool_use') {
              // Tool started
              const data = JSON.stringify({
                type: 'tool_start',
                toolName: event.toolName,
                toolInput: event.toolInput,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } else if (event.type === 'tool_result') {
              // Tool completed
              toolBlocks.push({
                type: 'tool',
                name: event.toolName || 'unknown',
                content: event.toolResult || '',
              });

              const data = JSON.stringify({
                type: 'tool_stop',
                toolName: event.toolName,
                toolResult: event.toolResult,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } else if (event.type === 'complete') {
              // Conversation complete - save to database
              const allBlocks = [
                {
                  type: 'text',
                  content: fullTextContent,
                },
                ...toolBlocks,
              ];

              await db
                .update(chatMessages)
                .set({
                  blocks: allBlocks as never,
                  content: fullTextContent,
                })
                .where(eq(chatMessages.id, assistantMessage.id));

              // Update session message count
              await db
                .update(chatSessions)
                .set({
                  messageCount: requirementsSession.messageCount + 2, // user + assistant
                  lastActivityAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(chatSessions.id, requirementsSession.id));

              console.log(`✅ Assistant message saved with streaming content`);

              // Send completion event
              const data = JSON.stringify({
                type: 'complete',
                messageId: assistantMessage.id,
                usage: event.usage,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          controller.close();
        } catch (error) {
          console.error('Error in SSE stream:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in requirements chat:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

