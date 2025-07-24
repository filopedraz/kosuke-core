import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db/drizzle';
import { getProjectById } from '@/lib/db/projects';
import { chatMessages } from '@/lib/db/schema';

// Webhook authentication
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret-change-in-production';

/**
 * Webhook endpoint for Python service to save assistant messages
 * POST /api/projects/[id]/webhook/message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify webhook authentication
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${WEBHOOK_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      console.error('Webhook authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse request body
    const {
      content,
      role = 'assistant',
      modelType = 'premium',
      tokensInput = 0,
      tokensOutput = 0,
      contextTokens = 0,
    } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Save message to database
    const [savedMessage] = await db.insert(chatMessages).values({
      projectId,
      userId: project.createdBy,
      content,
      role,
      modelType,
      tokensInput,
      tokensOutput,
      contextTokens,
    }).returning();

    console.log(`✅ Webhook: Saved ${role} message for project ${projectId}`);

    return NextResponse.json({
      success: true,
      messageId: savedMessage.id,
      timestamp: savedMessage.timestamp,
    });
  } catch (error) {
    console.error('Error in message webhook:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
} 