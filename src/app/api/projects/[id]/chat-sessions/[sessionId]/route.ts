import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { Agent } from '@/lib/agent';
import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, projects } from '@/lib/db/schema';
import { getDockerService } from '@/lib/docker';
import { deleteDir } from '@/lib/fs/operations';
import { getGitHubToken } from '@/lib/github/auth';
import { sessionManager } from '@/lib/sessions';
import { uploadFile } from '@/lib/storage';
import { and, eq } from 'drizzle-orm';

// Schema for updating a chat session
const updateChatSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
});

// Schema for sending a message - support both formats
const sendMessageSchema = z.union([
  z.object({
    message: z.object({
      content: z.string()
    }),
  }),
  z.object({
    content: z.string(),
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

/**
 * PUT /api/projects/[id]/chat-sessions/[sessionId]
 * Update a chat session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return ApiErrorHandler.projectNotFound();
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // Verify chat session exists and belongs to project
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.projectId, projectId),
          eq(chatSessions.sessionId, sessionId)
        )
      );

    if (!session) {
      return ApiErrorHandler.chatSessionNotFound();
    }

    // Parse request body
    const body = await request.json();
    const parseResult = updateChatSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiErrorHandler.validationError(parseResult.error);
    }

    const updateData = parseResult.data;

    // Update chat session
    const [updatedSession] = await db
      .update(chatSessions)
      .set({
        ...updateData,
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      })
      .where(eq(chatSessions.id, session.id))
      .returning();

    return NextResponse.json({
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error updating chat session:', error);
    return ApiErrorHandler.handle(error);
  }
}

/**
 * DELETE /api/projects/[id]/chat-sessions/[sessionId]
 * Delete a chat session and associated messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return ApiErrorHandler.projectNotFound();
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // Verify chat session exists and belongs to project
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.projectId, projectId),
          eq(chatSessions.sessionId, sessionId)
        )
      );

    if (!session) {
      return ApiErrorHandler.chatSessionNotFound();
    }

    // Prevent deletion of default chat session
    if (session.isDefault) {
      return ApiErrorHandler.badRequest('Cannot delete default chat session');
    }

    // Step 1: Stop the preview container for this session
    try {
      console.log(`Stopping preview container for session ${sessionId} in project ${projectId}`);
      const dockerService = getDockerService();
      await dockerService.stopPreview(projectId, sessionId);
      console.log(`Preview container stopped successfully for session ${sessionId}`);
    } catch (containerError) {
      // Log but continue - we still want to delete the session even if container cleanup fails
      console.error(`Error stopping preview container for session ${sessionId}:`, containerError);
      console.log(`Continuing with session deletion despite container cleanup failure`);
    }

    // Step 2: Delete session files after container is stopped
    const sessionPath = sessionManager.getSessionPath(projectId, sessionId);
    let filesWarning = null;

    try {
      await deleteDir(sessionPath);
      console.log(`Successfully deleted session directory: ${sessionPath}`);
    } catch (dirError) {
      console.error(`Error deleting session directory: ${sessionPath}`, dirError);
      filesWarning = "Session deleted but some files could not be removed";
    }

    // Step 3: Delete chat session from database (cascade will delete associated messages)
    await db
      .delete(chatSessions)
      .where(eq(chatSessions.id, session.id));

    return NextResponse.json({
      success: true,
      message: 'Chat session deleted successfully',
      ...(filesWarning && { warning: filesWarning }),
    });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return ApiErrorHandler.handle(error);
  }
}

/**
 * POST /api/projects/[id]/chat-sessions/[sessionId]
 * Send a message to a specific chat session
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
): Promise<Response> {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    // Await params to get the id and sessionId
    const { id, sessionId } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    // Get the project and verify access
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return ApiErrorHandler.projectNotFound();
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // Get the chat session and verify it belongs to this project
    const [chatSession] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.projectId, projectId),
          eq(chatSessions.sessionId, sessionId)
        )
      );

    if (!chatSession) {
      return ApiErrorHandler.chatSessionNotFound();
    }

    // Parse request body - support both JSON and FormData
    const contentType = req.headers.get('content-type') || '';
    let messageContent: string;
    let includeContext = false;
    let contextFiles: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Process FormData request (for image uploads) - return JSON response
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
        chatSessionId: chatSession.id,
        userId: userId,
        content: messageContent,
        role: 'user',
        modelType: 'premium',
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
        return ApiErrorHandler.validationError(parseResult.error);
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
      chatSessionId: chatSession.id,
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
      chatSessionId: chatSession.id,
      userId: userId,
      content: null, // Will be populated by webhook
      role: 'assistant',
      modelType: 'premium',
    }).returning();

    console.log(`✅ Assistant message placeholder created with ID: ${assistantMessage.id}`);

    // Mark unused variables for future use
    void includeContext;
    void contextFiles;

    // Get GitHub token for the user (optional for GitHub integration)
    let githubToken: string | null = null;

    try {
      githubToken = await getGitHubToken(userId);
      if (githubToken) {
        console.log(`🔗 GitHub integration enabled for session: ${chatSession.sessionId}`);
      } else {
        console.log(`⚪ GitHub integration disabled: no token found for user ${userId}`);
      }
    } catch (error) {
      console.log(`⚠️ GitHub token retrieval failed: ${error}`);
    }

    // Validate session directory exists
    const sessionValid = await sessionManager.validateSessionDirectory(projectId, chatSession.sessionId);

    if (!sessionValid) {
      return new Response(
        JSON.stringify({
          error: 'Session environment not found. Start a preview for this session first to initialize the environment.',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Session environment validated for session ${chatSession.sessionId}`);

    // Initialize Agent with session configuration
    const agent = new Agent({
      projectId,
      sessionId: chatSession.sessionId,
      githubToken,
      assistantMessageId: assistantMessage.id,
      userId,
    });

    console.log(`🚀 Starting agent stream for session ${chatSession.sessionId}`);

    // Create a ReadableStream from the agent's async generator
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream events from agent
          for await (const event of agent.run(messageContent)) {
            // Format as Server-Sent Events
            const data = JSON.stringify(event);
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }

          // Send completion marker
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('❌ Error in agent stream:', error);

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
    console.error('Error in session chat endpoint:', error);

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
