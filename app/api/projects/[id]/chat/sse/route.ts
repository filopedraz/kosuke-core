import { NextRequest } from 'next/server';
import { eq, gt, desc, and, sql } from 'drizzle-orm';

import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getProjectById } from '@/lib/db/projects';
import { chatMessages } from '@/lib/db/schema';

// Type for SSE message
interface SSEMessage {
  type: 'new_message' | 'file_updated' | 'heartbeat' | 'token_update';
  message?: {
    id: number;
    content: string;
    role: string;
    tokensInput?: number;
    tokensOutput?: number;
    contextTokens?: number;
  };
  timestamp: number;
  operation?: {
    type: 'create' | 'edit' | 'delete';
    path: string;
  };
  tokens?: {
    tokensSent: number;
    tokensReceived: number;
    contextSize: number;
  };
}

/**
 * GET /api/projects/[id]/chat/sse
 * Server-Sent Events endpoint for receiving real-time chat updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get the session
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const projectId = Number(id);
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

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const lastMessageId = Number(searchParams.get('lastMessageId') || '0');

  // Create a transform stream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial connection message
  const initialMessage: SSEMessage = {
    type: 'heartbeat',
    timestamp: Date.now(),
  };
  
  writer.write(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`));

  // Handle client connection close
  request.signal.addEventListener('abort', () => {
    console.log('SSE connection closed by client');
    writer.close();
  });

  // Setup periodic heartbeat to keep the connection alive
  const heartbeatInterval = setInterval(async () => {
    try {
      const heartbeat: SSEMessage = {
        type: 'heartbeat',
        timestamp: Date.now(),
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`));
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      clearInterval(heartbeatInterval);
      writer.close();
    }
  }, 60000); // Send heartbeat every 60 seconds (increased from 30 seconds)

  // Track the last time we checked for messages
  let lastPollTime = Date.now();
  let lastPolledMessageId = lastMessageId;

  // Setup polling for new messages
  // Note: In a production environment, you'd want to use a more efficient
  // mechanism like a message queue or a pub/sub system
  const pollInterval = setInterval(async () => {
    try {
      const now = Date.now();
      // Only poll if it's been at least 3 seconds since the last poll
      if (now - lastPollTime >= 3000) {
        lastPollTime = now;
        
        // Check for new messages since lastPolledMessageId
        const conditions = lastPolledMessageId > 0
          ? and(
              eq(chatMessages.projectId, projectId),
              gt(chatMessages.id, lastPolledMessageId)
            )
          : eq(chatMessages.projectId, projectId);

        const newMessages = await db
          .select()
          .from(chatMessages)
          .where(conditions)
          .orderBy(desc(chatMessages.timestamp))
          .limit(10); // Limit the number of messages to process at once

        if (newMessages.length > 0) {
          console.log(`SSE: Found ${newMessages.length} new messages`);
          
          // Update the last polled message ID
          lastPolledMessageId = Math.max(...newMessages.map(msg => msg.id));
          
          // Calculate total token metrics
          let totalTokensInput = 0;
          let totalTokensOutput = 0;
          let currentContextSize = 0;
          
          // Get all messages to calculate totals
          const allMessages = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.projectId, projectId));
            
          // Get aggregated token totals - this will include everything
          const tokenTotals = await db
            .select({
              totalInput: sql`SUM(tokens_input)`,
              totalOutput: sql`SUM(tokens_output)`
            })
            .from(chatMessages)
            .where(eq(chatMessages.projectId, projectId));
          
          // Calculate totals from token totals - this now includes ALL tokens
          // including those from file reads since we're counting them in tokensInput
          totalTokensInput = Number(tokenTotals[0]?.totalInput || 0);
          totalTokensOutput = Number(tokenTotals[0]?.totalOutput || 0);
          
          // Get the current context size from the most recent message
          const latestMessages = allMessages.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          if (latestMessages.length > 0 && latestMessages[0].contextTokens) {
            currentContextSize = latestMessages[0].contextTokens;
          }
          
          console.log(`📊 SSE token update - Input: ${totalTokensInput}, Output: ${totalTokensOutput}, Context: ${currentContextSize}`);
          
          // Send a token update event with the latest metrics
          const tokenEvent: SSEMessage = {
            type: 'token_update',
            timestamp: Date.now(),
            tokens: {
              tokensSent: totalTokensInput,
              tokensReceived: totalTokensOutput,
              contextSize: currentContextSize
            }
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(tokenEvent)}\n\n`));
          
          // Send each new message as a separate event
          for (const msg of newMessages.reverse()) {
            const messageEvent: SSEMessage = {
              type: 'new_message',
              message: {
                id: msg.id,
                content: msg.content,
                role: msg.role,
                tokensInput: msg.tokensInput || undefined,
                tokensOutput: msg.tokensOutput || undefined,
                contextTokens: msg.contextTokens || undefined
              },
              timestamp: Date.now(),
            };
            
            // Check if this is an operation update (content starts with 🔧)
            if (msg.role === 'assistant' && msg.content.startsWith('🔧')) {
              try {
                // Try to parse file operation data from the message
                const contentWithoutPrefix = msg.content.substring(2).trim();
                
                // Only try to parse if it looks like valid JSON
                if (contentWithoutPrefix.startsWith('{') && contentWithoutPrefix.endsWith('}')) {
                  try {
                    const operationData = JSON.parse(contentWithoutPrefix);
                    
                    // Validate required fields exist
                    if (operationData.type && operationData.path) {
                      // If it's a file operation, send a file_updated event with operation details
                      const fileUpdatedEvent: SSEMessage = {
                        type: 'file_updated',
                        timestamp: Date.now(),
                        operation: {
                          type: operationData.type as 'create' | 'edit' | 'delete',
                          path: operationData.path
                        }
                      };
                      await writer.write(encoder.encode(`data: ${JSON.stringify(fileUpdatedEvent)}\n\n`));
                    } else {
                      throw new Error('Missing required fields in file operation data');
                    }
                  } catch (jsonError) {
                    console.error('Error parsing JSON in file operation:', jsonError);
                    // Fall back to generic file_updated event
                    const fileUpdatedEvent: SSEMessage = {
                      type: 'file_updated',
                      timestamp: Date.now()
                    };
                    await writer.write(encoder.encode(`data: ${JSON.stringify(fileUpdatedEvent)}\n\n`));
                  }
                } else {
                  // Not JSON format, just send generic file update
                  const fileUpdatedEvent: SSEMessage = {
                    type: 'file_updated',
                    timestamp: Date.now()
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(fileUpdatedEvent)}\n\n`));
                }
              } catch {
                // If parsing fails, send a generic file_updated event
                const fileUpdatedEvent: SSEMessage = {
                  type: 'file_updated',
                  timestamp: Date.now()
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(fileUpdatedEvent)}\n\n`));
              }
            }
            
            await writer.write(encoder.encode(`data: ${JSON.stringify(messageEvent)}\n\n`));
          }
        }
      }
    } catch (error) {
      console.error('Error polling for new messages:', error);
      // Don't close the connection on polling errors
    }
  }, 2000); // Poll every 2 seconds for new messages (increased from 1 second)

  // Cleanup when the connection is closed
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    clearInterval(pollInterval);
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
} 