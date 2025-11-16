import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/drizzle';
import { requirementsMessages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { verifyProjectAccess } from '@/lib/projects';
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
    const messages = await db
      .select()
      .from(requirementsMessages)
      .where(eq(requirementsMessages.projectId, projectId))
      .orderBy(requirementsMessages.timestamp);

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

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // TODO: Integrate with kosuke-cli for actual requirements gathering
          // For now, provide a mock streaming response

          // Simulate streaming text response
          const mockResponse = `Based on your message: "${content}"

I understand you'd like to build a project. Let me help you refine the requirements.

**Current Understanding:**
- Project Name: ${project.name}
- Initial Concept: ${content}

**Questions to refine requirements:**
1. What is the primary goal of this project?
2. Who are the target users?
3. What are the must-have features for v1?
4. Are there any technical constraints or preferences?

Please provide more details so I can help build a comprehensive requirements document.`;

          // Stream the response in chunks to simulate real streaming
          const words = mockResponse.split(' ');

          for (let i = 0; i < words.length; i++) {
            const event = {
              type: 'content_block_delta',
              index: 0,
              delta_type: 'text_delta',
              text: words[i] + (i < words.length - 1 ? ' ' : ''),
            };

            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));

            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Update assistant message in database with complete response
          await db
            .update(requirementsMessages)
            .set({
              blocks: [
                {
                  type: 'text',
                  content: mockResponse,
                },
              ],
            })
            .where(eq(requirementsMessages.id, assistantMessage.id));

          // Send completion marker
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'message_complete' })}\n\n`
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

