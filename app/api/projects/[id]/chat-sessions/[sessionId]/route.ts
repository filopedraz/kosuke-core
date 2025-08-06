import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { uploadFile } from '@/lib/storage';
import { and, eq } from 'drizzle-orm';

// Schema for updating a chat session
const updateChatSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  // GitHub merge status fields
  branchMergedAt: z.string().optional(),
  branchMergedBy: z.string().max(100).optional(),
  mergeCommitSha: z.string().max(40).optional(),
  pullRequestNumber: z.number().int().positive().optional(),
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
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
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parseResult = updateChatSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.format() },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to update chat session' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
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
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of default chat session
    if (session.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default chat session' },
        { status: 400 }
      );
    }

    // Delete chat session (cascade will delete associated messages)
    await db
      .delete(chatSessions)
      .where(eq(chatSessions.id, session.id));

    return NextResponse.json({
      success: true,
      message: 'Chat session deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat session' },
      { status: 500 }
    );
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
      return new Response('Unauthorized', { status: 401 });
    }

    // Await params to get the id and sessionId
    const { id, sessionId } = await params;
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
      return new Response('Chat session not found', { status: 404 });
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

    // Proxy stream directly to Python FastAPI service
    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';

    // Use the session-aware chat endpoint
    const endpoint = '/api/chat/session';
    console.log(`🚀 Routing to: ${endpoint} for session ${chatSession.sessionId}`);

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

    const response = await fetch(`${agentServiceUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        prompt: messageContent,
        assistant_message_id: assistantMessage.id,
        github_token: githubToken,
        session_id: chatSession.sessionId,
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
