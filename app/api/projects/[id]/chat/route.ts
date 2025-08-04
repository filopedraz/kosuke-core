
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, projects } from '@/lib/db/schema';
import { uploadFile } from '@/lib/storage';
import { eq } from 'drizzle-orm';

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
 * Save an uploaded image to storage and return the URL
 */
async function saveUploadedImage(file: File, projectId: number): Promise<string> {
  // Create a prefix to organize images by project
  const prefix = `chat-images/project-${projectId}`;

  try {
    // Upload the file using the generic uploadFile function
    const imageUrl = await uploadFile(file, prefix);
    console.log(`✅ Image uploaded to storage: ${imageUrl}`);
    return imageUrl;
  } catch (error) {
    console.error('Error uploading image to storage:', error);
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
    const { userId } = await auth();
    if (!userId) {
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
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get the user has access to the project
    if (project.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get chat history
    const chatHistory = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId))
      .orderBy(chatMessages.timestamp);

    console.log(`📊 Chat history for project ${projectId}: ${chatHistory.length} messages`);

    // Return messages directly (no more actions)
    return NextResponse.json({
      messages: chatHistory
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
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Await params to get the id
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return new Response('Invalid project ID', { status: 400 });
    }

    // Get the project and verify access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    if (project.createdBy !== userId) {
      return new Response('Forbidden', { status: 403 });
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

      // Save the user message to the database
      await db.insert(chatMessages).values({
        projectId,
        userId: userId,
        content: messageContent,
        role: 'user',
        modelType: 'premium',
        // Token counting removed
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Image message saved. Processing will be handled via webhooks."
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

    // Save user message immediately
    const [userMessage] = await db.insert(chatMessages).values({
      projectId,
      userId: userId,
      content: messageContent,
      role: 'user',
      modelType: 'premium',
      tokensInput: 0, // Token counting moved to webhook
      tokensOutput: 0,
      contextTokens: 0,
    }).returning();

    console.log(`✅ User message saved with ID: ${userMessage.id}`);

    // Create assistant message placeholder for streaming
    const [assistantMessage] = await db.insert(chatMessages).values({
      projectId,
      userId: userId,
      content: null, // Will be populated by webhook
      role: 'assistant',
      modelType: 'premium',
      // Token counting removed
    }).returning();

    console.log(`✅ Assistant message placeholder created with ID: ${assistantMessage.id}`);

    // Proxy stream directly to Python FastAPI service
    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';

    // Always use the chat stream endpoint
    const endpoint = '/api/chat/stream';
    console.log(`🚀 Routing to: ${endpoint}`);

    // Mark unused variables for future use
    void includeContext;
    void contextFiles;

    const response = await fetch(`${agentServiceUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        prompt: messageContent,
        assistant_message_id: assistantMessage.id,
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

    // Stream the response from Python service directly to client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Assistant-Message-Id': assistantMessage.id.toString(),
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
