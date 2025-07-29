import { desc, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getProjectById } from '@/lib/db/projects';
import { Action, actions, chatMessages } from '@/lib/db/schema';
import { hasReachedMessageLimit } from '@/lib/models';
import { uploadFile } from '@/lib/storage';

// Schema for sending a message - support both formats
const sendMessageSchema = z.union([
  z.object({
    message: z.object({
      content: z.string()
    }),
  }),
  z.object({
    content: z.string()
  })
]);

// Error types to match the Agent error types
type ErrorType = 'timeout' | 'parsing' | 'processing' | 'unknown';

/**
 * Get chat history for a project
 */
async function getChatHistoryByProjectId(projectId: number, options: { limit?: number; oldest?: boolean } = {}) {
  const { oldest = false } = options;
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.projectId, projectId))
    .orderBy(oldest ? chatMessages.timestamp : desc(chatMessages.timestamp));

  return oldest ? history : history.reverse();
}

/**
 * Save an uploaded image to Minio and return the URL
 */
async function saveUploadedImage(file: File, projectId: number): Promise<string> {
  // Create a prefix to organize images by project
  const prefix = `chat-images/project-${projectId}`;

  try {
    // Upload the file to Minio using the generic uploadFile function
    const imageUrl = await uploadFile(file, prefix);
    console.log(`✅ Image uploaded to Minio: ${imageUrl}`);
    return imageUrl;
  } catch (error) {
    console.error('Error uploading image to Minio:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Process a FormData request and extract the content and image
 */
async function processFormDataRequest(req: NextRequest, projectId: number): Promise<{
  content: string;
  includeContext: boolean;
  contextFiles: Array<{ name: string; content: string; }>;
  imageUrl?: string;
}> {
  const formData = await req.formData();
  const content = formData.get('content') as string || '';
  const includeContext = formData.get('includeContext') === 'true';
  const contextFilesStr = formData.get('contextFiles') as string || '[]';
  const contextFiles = JSON.parse(contextFilesStr);

  // Process image if present
  const imageFile = formData.get('image') as File | null;
  let imageUrl: string | undefined;

  if (imageFile) {
    imageUrl = await saveUploadedImage(imageFile, projectId);
  }

  return {
    content,
    includeContext,
    contextFiles,
    imageUrl
  };
}

// Removed proxyToPythonAgent - now using webhook-based approach

/**
 * GET /api/projects/[id]/chat
 * Get chat history for a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Await params to get the id
    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get the user has access to the project
    if (project.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get chat history
    const chatHistory = await getChatHistoryByProjectId(projectId, {
      oldest: true,
    });

    console.log(`📊 Chat history for project ${projectId}: ${chatHistory.length} messages`);

    // Extract message IDs from assistant messages (since operations are linked to messages)
    const messageIds = chatHistory
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.id);

    console.log(`📊 Assistant messages found: ${messageIds.length} (IDs: ${messageIds.join(', ')})`);

    // Fetch file operations for these messages if there are any
    let operations: Action[] = [];
    if (messageIds.length > 0) {
      operations = await db
        .select()
        .from(actions)
        .where(inArray(actions.messageId, messageIds));

      console.log(`📊 Actions found in database: ${operations.length}`);

      // Log each action for debugging
      operations.forEach((op, index) => {
        console.log(`📊 Action ${index + 1}: {id: ${op.id}, type: "${op.type}", path: "${op.path}", messageId: ${op.messageId}, status: "${op.status}", timestamp: ${op.timestamp}}`);
      });
    }

    // Group operations by message ID
    type FormattedOperation = {
      id: number;
      type: string;
      path: string;
      timestamp: Date;
      status: string;
      messageId: number;
    };

    const operationsByMessageId = operations.reduce<Record<number, FormattedOperation[]>>((acc, op) => {
      if (!acc[op.messageId]) {
        acc[op.messageId] = [];
      }
      acc[op.messageId].push({
        id: op.id,
        type: op.type,
        path: op.path,
        timestamp: op.timestamp,
        status: op.status,
        messageId: op.messageId
      });
      return acc;
    }, {});

    console.log(`📊 Operations grouped by message ID:`, JSON.stringify(operationsByMessageId, null, 2));

    // Attach operations to their respective messages
    const messagesWithOperations = chatHistory.map(msg => ({
      ...msg,
      actions: operationsByMessageId[msg.id] || []
    }));

    // Log final result for debugging
    const messagesWithActionsCount = messagesWithOperations.filter(msg => msg.actions && msg.actions.length > 0).length;
    console.log(`📊 Final result: ${messagesWithOperations.length} total messages, ${messagesWithActionsCount} messages have actions`);

    messagesWithOperations.forEach((msg, index) => {
      if (msg.actions && msg.actions.length > 0) {
        console.log(`📊 Message ${index + 1} (ID: ${msg.id}, role: ${msg.role}) has ${msg.actions.length} actions:`,
          msg.actions.map(a => `${a.type}:${a.path}`).join(', '));
      }
    });

    // Return messages with nested operations
    return NextResponse.json({
      messages: messagesWithOperations
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/chat
 * Send a message to the chat
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Get the session
    const session = await getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Await params to get the id
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return new Response('Invalid project ID', { status: 400 });
    }

    // Get the project and verify access
    const project = await getProjectById(projectId);
    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    if (project.createdBy !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // Check if the user has reached their message limit
    try {
      const limitReached = await hasReachedMessageLimit(session.user.id);
      if (limitReached) {
        throw new Error('PREMIUM_LIMIT_REACHED');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'PREMIUM_LIMIT_REACHED') {
        console.log('User has reached premium message limit, returning 403');
        return new Response(
          JSON.stringify({ error: 'You have reached your message limit for your current plan', code: 'PREMIUM_LIMIT_REACHED' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      // Other errors
      console.error('Error checking message limit:', error);
    }

    // Parse request body - support both JSON and FormData
    const contentType = req.headers.get('content-type') || '';
    let messageContent: string;
    let includeContext = false;
    let contextFiles: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Process FormData request (for image uploads) - return JSON response like before
      console.log('Processing multipart/form-data request');
      const formData = await processFormDataRequest(req, projectId);
      messageContent = formData.content;
      includeContext = formData.includeContext;
      contextFiles = formData.contextFiles.map(f => f.content);

      if (formData.imageUrl) {
        console.log(`Image URL received: ${formData.imageUrl}`);
        // Add image URL to message content as markdown link
        messageContent = `${messageContent}\n\n[Attached Image](${formData.imageUrl})`;
      }

      // For image uploads, process traditionally and return JSON
      const { countTokens } = await import('@/lib/llm/utils');
      const messageTokens = countTokens(messageContent);

      // Calculate cumulative token totals
      const tokenTotals = await db
        .select({
          totalInput: sql`SUM(tokens_input)`,
          totalOutput: sql`SUM(tokens_output)`
        })
        .from(chatMessages)
        .where(eq(chatMessages.projectId, projectId));

      const totalTokensInput = Number(tokenTotals[0]?.totalInput || 0) + messageTokens;
      const totalTokensOutput = Number(tokenTotals[0]?.totalOutput || 0);

      // Save the user message to the database
      await db.insert(chatMessages).values({
        projectId,
        userId: session.user.id,
        content: messageContent,
        role: 'user',
        modelType: 'premium',
        tokensInput: messageTokens,
        tokensOutput: 0,
        contextTokens: messageTokens,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Image message saved. Processing will be handled via webhooks.",
          totalTokensInput,
          totalTokensOutput,
          contextTokens: messageTokens
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Process JSON request for text messages - use streaming proxy
      console.log('Processing JSON request for streaming');
      const body = await req.json();
      console.log('Request body:', JSON.stringify(body));

      const parseResult = sendMessageSchema.safeParse(body);

      if (!parseResult.success) {
        console.error('Invalid request format:', parseResult.error);
        return new Response(
          JSON.stringify({ error: 'Invalid request format', details: parseResult.error.format() }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Extract content based on the format received
      if ('message' in parseResult.data) {
        // Format: { message: { content } }
        messageContent = parseResult.data.message.content;
      } else {
        // Format: { content }
        messageContent = parseResult.data.content;
      }

      // Extract options if present
      if ('includeContext' in body) {
        includeContext = body.includeContext || false;
      }
      if ('contextFiles' in body) {
        contextFiles = body.contextFiles || [];
      }
    }

    console.log(`Received message content: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`);

    // Count tokens for input message using tiktoken
    const { countTokens } = await import('@/lib/llm/utils');
    const messageTokens = countTokens(messageContent);

    // Calculate cumulative token totals
    const tokenTotals = await db
      .select({
        totalInput: sql`SUM(tokens_input)`,
        totalOutput: sql`SUM(tokens_output)`
      })
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId));

    const totalTokensInput = Number(tokenTotals[0]?.totalInput || 0) + messageTokens;
    const totalTokensOutput = Number(tokenTotals[0]?.totalOutput || 0);

    console.log(`📊 Message tokens: ${messageTokens}`);
    console.log(`📊 Total tokens input (including this message): ${totalTokensInput}`);
    console.log(`📊 Total tokens output: ${totalTokensOutput}`);

    // 1. Save user message immediately
    const [userMessage] = await db.insert(chatMessages).values({
      projectId,
      userId: session.user.id,
      content: messageContent,
      role: 'user',
      modelType: 'premium',
      tokensInput: messageTokens,
      tokensOutput: 0,
      contextTokens: messageTokens,
    }).returning();

    console.log(`✅ User message saved with ID: ${userMessage.id}`);

    // 2. For text messages, proxy stream directly to Python FastAPI service (like the old approach)
    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

    // Mark unused variables for future use
    void includeContext;
    void contextFiles;

    const response = await fetch(`${agentServiceUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        prompt: messageContent,
      }),
    });

    if (!response.ok) {
      // Get detailed error information from FastAPI
      let errorDetails = response.statusText;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          console.error('Python agent service error body:', errorBody);
          errorDetails = errorBody;
        }
      } catch (e) {
        console.error('Failed to read error response body:', e);
      }

      console.error('Python agent service error:', response.status, response.statusText);
      return new Response(`Agent service error: ${errorDetails}`, {
        status: response.status
      });
    }

    // Stream the response from Python service directly to client (like the old approach)
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in unified chat endpoint:', error);

    // Determine error type for better client handling
    let errorType: ErrorType = 'unknown';
    let errorMessage = 'Error processing request';

    if (error instanceof Error) {
      errorMessage = error.message;
      // Try to determine error type
      if ('errorType' in error && typeof (error as Record<string, unknown>).errorType === 'string') {
        errorType = (error as Record<string, unknown>).errorType as ErrorType;
      } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorType = 'timeout';
      } else if (error.message.includes('parse') || error.message.includes('JSON')) {
        errorType = 'parsing';
      } else {
        errorType = 'processing';
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorType
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
