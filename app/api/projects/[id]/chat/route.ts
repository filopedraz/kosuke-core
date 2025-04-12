import { eq, desc, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getProjectById } from '@/lib/db/projects';
import { chatMessages, actions, Action } from '@/lib/db/schema';
import { uploadFile } from '@/lib/storage';
import { hasReachedMessageLimit } from '@/lib/models';
import { Agent } from '@/lib/llm/core/agent';

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

/**
 * Extract image URLs from prompt content
 * Currently used by the convertToMultiModalContent function for future implementation.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
function extractImageUrls(prompt: string): string[] {
  // Regular expression to match Markdown image links
  const imageRegex = /\[Attached Image\]\(([^)]+)\)/g;
  const imageUrls: string[] = [];
  let match;

  while ((match = imageRegex.exec(prompt)) !== null) {
    // Extract the actual image URL from the markdown link
    const imageUrl = match[1];
    // Ensure URLs are properly formed
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      imageUrls.push(imageUrl);
    }
  }

  return imageUrls;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Convert a text prompt with image URLs to multi-modal content
 * This function is intended for use with AI models that support multimodal inputs.
 * Currently, it's kept for future use with the Agent class.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
function convertToMultiModalContent(
  prompt: string
): Array<{ type: 'text' | 'image' | 'image_url'; text?: string; image_url?: { url: string } }> {
  const imageUrls = extractImageUrls(prompt);

  // If no images, return simple text content
  if (imageUrls.length === 0) {
    return [{ type: 'text', text: prompt }];
  }

  // Replace image URLs with placeholders to split the text
  let processedText = prompt;
  const imagePlaceholders: Map<string, string> = new Map();

  imageUrls.forEach((url, index) => {
    const placeholder = `__IMAGE_PLACEHOLDER_${index}__`;
    processedText = processedText.replace(`[Attached Image](${url})`, placeholder);
    imagePlaceholders.set(placeholder, url);
  });

  // Split text by placeholders and create multi-modal content
  const parts: Array<{
    type: 'text' | 'image' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }> = [];
  const segments = processedText.split(/(__IMAGE_PLACEHOLDER_\d+__)/);

  segments.forEach(segment => {
    if (imagePlaceholders.has(segment)) {
      // This is an image placeholder
      parts.push({
        type: 'image_url',
        image_url: { url: imagePlaceholders.get(segment)! },
      });
    } else if (segment.trim()) {
      // This is a text segment
      parts.push({
        type: 'text',
        text: segment.trim(),
      });
    }
  });

  return parts;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

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

    // Save the user message to the database
    await db.insert(chatMessages).values({
      projectId,
      userId: session.user.id,
      content: messageContent,
      role: 'user',
      modelType: 'premium',
    });

    console.log(`Processing request with Agent class for project ${projectId}`);
    
    // Create an Agent instance and run it with the message content
    const agent = new Agent(projectId);
    const agentResult = await agent.run(messageContent);

    if (!agentResult.success) {
      console.error('Error processing request:', agentResult.error);
      return NextResponse.json(
        { message: 'Error processing request', error: agentResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing chat:', error);
    return NextResponse.json(
      { message: 'Error processing request', error: String(error) },
      { status: 500 }
    );
  }
}