import { eq, desc, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getProjectById } from '@/lib/db/projects';
import { chatMessages, actions, Action } from '@/lib/db/schema';
import { uploadFile } from '@/lib/storage';
import { hasReachedMessageLimit } from '@/lib/models';

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

    // Extract message IDs from assistant messages (since operations are linked to messages)
    const messageIds = chatHistory
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.id);

    // Fetch file operations for these messages if there are any
    let operations: Action[] = [];
    if (messageIds.length > 0) {
      operations = await db
        .select()
        .from(actions)
        .where(inArray(actions.messageId, messageIds));
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

    // Attach operations to their respective messages
    const messagesWithOperations = chatHistory.map(msg => ({
      ...msg,
      actions: operationsByMessageId[msg.id] || []
    }));

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
): Promise<NextResponse> {
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
    const projectId = parseInt(id);

    // Check if the user has reached their message limit
    try {
      const limitReached = await hasReachedMessageLimit(session.user.id);
      if (limitReached) {
        throw new Error('PREMIUM_LIMIT_REACHED');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'PREMIUM_LIMIT_REACHED') {
        console.log('User has reached premium message limit, returning 403');
        return NextResponse.json(
          { error: 'You have reached your message limit for your current plan', code: 'PREMIUM_LIMIT_REACHED' },
          { status: 403 }
        );
      }
      // Other errors
      console.error('Error checking message limit:', error);
    }

    // Check if request is FormData or JSON
    const contentType = req.headers.get('content-type') || '';
    let messageContent: string;
    let imageUrl: string | undefined;
    
    if (contentType.includes('multipart/form-data')) {
      // Process FormData request
      console.log('Processing multipart/form-data request');
      const formData = await processFormDataRequest(req, projectId);
      messageContent = formData.content;
      imageUrl = formData.imageUrl;
      
      if (imageUrl) {
        console.log(`Image URL received: ${imageUrl}`);
        // Add image URL to message content as markdown link
        messageContent = `${messageContent}\n\n[Attached Image](${imageUrl})`;
      }
    } else {
      // Process JSON request
      console.log('Processing JSON request');
      const body = await req.json();
      console.log('Request body:', JSON.stringify(body));
      
      const parseResult = sendMessageSchema.safeParse(body);
      
      if (!parseResult.success) {
        console.error('Invalid request format:', parseResult.error);
        return NextResponse.json(
          { error: 'Invalid request format', details: parseResult.error.format() },
          { status: 400 }
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
    }

    console.log(`Received message content: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`);

    // Check if the message contains image references
    const hasImages = messageContent.includes('[Attached Image]');
    if (hasImages) {
      console.log('Detected images in the message');
    }

    // Count tokens for input message using tiktoken
    const { countTokens } = await import('@/lib/llm/utils');
    const messageTokens = countTokens(messageContent);
    
    // Calculate cumulative token totals
    // Get the sum of all tokens sent and received for this project
    const tokenTotals = await db
      .select({
        totalInput: sql`SUM(tokens_input)`,
        totalOutput: sql`SUM(tokens_output)`
      })
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId));
    
    // Use the totals or default to 0 if null
    const totalTokensInput = Number(tokenTotals[0]?.totalInput || 0) + messageTokens;
    const totalTokensOutput = Number(tokenTotals[0]?.totalOutput || 0);
    
    console.log(`📊 Message tokens: ${messageTokens}`);
    console.log(`📊 Total tokens input (including this message): ${totalTokensInput}`);
    console.log(`📊 Total tokens output: ${totalTokensOutput}`);
    
    // Reset context size to just this message when starting a new interaction
    const contextTokens = messageTokens;
    
    // Save the user message to the database with the current message tokens
    // Current message tokens added to tokensInput for this message
    await db.insert(chatMessages).values({
      projectId,
      userId: session.user.id,
      content: messageContent,
      role: 'user',
      modelType: 'premium',
      tokensInput: messageTokens,      // Tokens in this message
      tokensOutput: 0,                 // No output tokens for user messages
      contextTokens,                   // Reset context tokens to just this message
    });

    console.log(`✅ User message saved. Python agent will process via streaming and send webhooks.`);
    
    // Return success immediately - Python agent will handle processing via webhooks
    return NextResponse.json({ 
      success: true, 
      message: "Message received. Processing will be handled via streaming endpoint.",
      totalTokensInput,
      totalTokensOutput,
      contextTokens: messageTokens
    });
  } catch (error) {
    console.error('Error processing chat:', error);
    
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
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        errorType
      },
      { status: 500 }
    );
  }
}