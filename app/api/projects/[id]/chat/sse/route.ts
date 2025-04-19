import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getProjectById } from '@/lib/db/projects';
import { chatMessages } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

// Error types to match agent
type ErrorType = 'timeout' | 'parsing' | 'processing' | 'unknown';

// Extended message type with potential metadata
interface ChatMessage {
  id: number;
  projectId: number;
  userId: number | null;
  role: string;
  content: string;
  modelType: string | null;
  timestamp: Date;
  tokensInput: number | null;
  tokensOutput: number | null;
  contextTokens: number | null;
  metadata?: string | null;
}

/**
 * GET - Server-Sent Events endpoint for real-time chat updates
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<Response> {
  try {
    const session = await getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return new Response('Invalid project ID', { status: 400 });
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // Check if the user has access to the project
    if (project.createdBy !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // Set up SSE headers
    const encoder = new TextEncoder();
    const responseHeaders = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    };

    const stream = new ReadableStream({
      async start(controller) {
        // Token totals
        let lastTokens = {
          tokensSent: 0,
          tokensReceived: 0,
          contextSize: 0
        };

        // Track the last message ID we've seen
        let lastMessageId = 0;

        // Event loop
        while (true) {
          try {
            // Get the latest message
            const latestMessages = await db
              .select()
              .from(chatMessages)
              .where(eq(chatMessages.projectId, projectId))
              .orderBy(desc(chatMessages.timestamp))
              .limit(1) as ChatMessage[];

            // Get token totals
            const tokenTotals = await db
              .select({
                totalInput: sql`SUM(tokens_input)`,
                totalOutput: sql`SUM(tokens_output)`,
              })
              .from(chatMessages)
              .where(eq(chatMessages.projectId, projectId));

            const totalTokensInput = Number(tokenTotals[0]?.totalInput || 0);
            const totalTokensOutput = Number(tokenTotals[0]?.totalOutput || 0);

            // Get current context size
            const currentContextSize = latestMessages.length > 0 ? 
              (latestMessages[0].contextTokens || 0) : 0;

            // Send a token update if tokens have changed
            if (
              totalTokensInput !== lastTokens.tokensSent ||
              totalTokensOutput !== lastTokens.tokensReceived ||
              currentContextSize !== lastTokens.contextSize
            ) {
              // Update last tokens
              lastTokens = {
                tokensSent: totalTokensInput,
                tokensReceived: totalTokensOutput,
                contextSize: currentContextSize
              };

              // Send token update
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'token_update',
                    tokens: lastTokens
                  })}\n\n`
                )
              );
            }

            // Check if we have a new message
            if (
              latestMessages.length > 0 &&
              latestMessages[0].id > lastMessageId
            ) {
              const newMessage = latestMessages[0];
              lastMessageId = newMessage.id;

              // Check if this is an error message from metadata
              let hasError = false;
              let errorType: ErrorType = 'unknown';
              
              if (newMessage.metadata) {
                try {
                  const metadata = JSON.parse(newMessage.metadata);
                  if (metadata.errorType) {
                    hasError = true;
                    errorType = metadata.errorType as ErrorType;
                  }
                } catch (e) {
                  console.error('Error parsing message metadata:', e);
                }
              }

              // If it's an error message, send an error event
              if (hasError) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'error',
                      errorType,
                      message: newMessage.content,
                      messageId: newMessage.id
                    })}\n\n`
                  )
                );
              } else {
                // Otherwise send a new message event
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'new_message',
                      id: newMessage.id,
                      content: newMessage.content,
                      role: newMessage.role,
                      timestamp: newMessage.timestamp
                    })}\n\n`
                  )
                );
              }
            }

            // Send heartbeat to keep connection alive
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`
              )
            );

            // Wait before checking again
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            console.error('Error in SSE stream:', error);
            
            // Send an error event
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  errorType: 'unknown',
                  message: 'Error in SSE stream'
                })}\n\n`
              )
            );
            
            // Wait a bit before trying again or ending
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
    });

    return new Response(stream, { headers: responseHeaders });
  } catch (error) {
    console.error('Error setting up SSE:', error);
    return new Response('Error setting up event stream', { status: 500 });
  }
} 