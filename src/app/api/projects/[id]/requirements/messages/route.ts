import { db } from '@/lib/db/drizzle';
import { requirementsMessages } from '@/lib/db/schema';
import { verifyProjectAccess } from '@/lib/projects';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});

/**
 * GET /api/projects/[id]/requirements/messages
 * Get conversation history for requirements gathering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify project access
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);
    if (!hasAccess || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is in requirements status
    if (project.status !== 'requirements' && project.status !== 'in_development') {
      return NextResponse.json(
        { error: 'Project is not in requirements gathering mode' },
        { status: 400 }
      );
    }

    // Fetch conversation history from database
    let messages = await db
      .select()
      .from(requirementsMessages)
      .where(eq(requirementsMessages.projectId, projectId))
      .orderBy(requirementsMessages.timestamp);

    // If no messages exist, create an initial assistant message
    if (messages.length === 0) {
      const initialMessage = await db
        .insert(requirementsMessages)
        .values({
          projectId,
          userId,
          role: 'assistant',
          content: null,
          blocks: [
            {
              type: 'text',
              content:
                "Start by describing your project idea. I'll help you build comprehensive requirements through conversation.",
            },
          ],
          timestamp: new Date(),
        })
        .returning();

      messages = initialMessage;
    }

    return NextResponse.json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    console.error('Error fetching requirements messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/requirements/messages
 * Send a message for requirements gathering with streaming response
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify project access
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);
    if (!hasAccess || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is in requirements status
    if (project.status !== 'requirements') {
      return NextResponse.json(
        { error: 'Project is not in requirements gathering mode' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { content } = validation.data;

    // Save user message to database
    await db
      .insert(requirementsMessages)
      .values({
        projectId,
        userId,
        role: 'user',
        content,
        timestamp: new Date(),
      })
      .returning();

    // Create assistant message placeholder
    const [assistantMessage] = await db
      .insert(requirementsMessages)
      .values({
        projectId,
        userId,
        role: 'assistant',
        content: null,
        blocks: [],
        timestamp: new Date(),
      })
      .returning();

    // Get conversation history to check if this is the first request
    const messageHistory = await db
      .select()
      .from(requirementsMessages)
      .where(eq(requirementsMessages.projectId, projectId))
      .orderBy(requirementsMessages.timestamp);

    // Count non-initial messages (exclude the default welcome message)
    const isFirstUserMessage = messageHistory.filter(m => m.role === 'user').length <= 1;

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { runRequirementsGathering } = await import('@/lib/kosuke-cli/requirements');

          // Use the Docker-mounted projects directory
          const projectPath = `/app/projects/${projectId}`;

          // Ensure project directory exists before running requirements gathering
          const fs = await import('fs/promises');
          await fs.mkdir(projectPath, { recursive: true });
          console.log(`✅ Created/verified project directory: ${projectPath}`);

          let fullResponse = '';

          // Run requirements gathering with kosuke-cli
          const result = await runRequirementsGathering({
            projectPath,
            projectId,
            projectName: project.name,
            userMessage: content,
            isFirstRequest: isFirstUserMessage,
            onStream: (text: string) => {
              // Stream the text to client
              fullResponse += text;
              const event = {
                type: 'content_block_delta',
                index: 0,
                delta_type: 'text_delta',
                text: text,
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
            },
          });

          if (!result.success) {
            throw new Error(result.error || 'Requirements gathering failed');
          }

          // Use the full response from result
          const finalResponse = result.response || fullResponse;

          // Update assistant message in database with complete response
          await db
            .update(requirementsMessages)
            .set({
              blocks: [
                {
                  type: 'text',
                  content: finalResponse,
                },
              ],
            })
            .where(eq(requirementsMessages.id, assistantMessage.id));

          // If docs.md was created, update the project's requirements status
          if (result.docs) {
            console.log(`✅ docs.md created for project ${projectId}`);
            // Note: The PATCH endpoint will handle the final confirmation
          }

          // Send completion marker
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'message_complete',
                hasDocsMd: !!result.docs,
                tokenUsage: result.tokenUsage,
              })}\n\n`
            )
          );
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('❌ Error in requirements stream:', error);

          // Send error event
          const errorEvent = {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          };
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Assistant-Message-Id': assistantMessage.id.toString(),
      },
    });
  } catch (error) {
    console.error('Error processing requirements message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

