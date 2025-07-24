import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db/drizzle';
import { getProjectById } from '@/lib/db/projects';
import { actions, chatMessages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// Webhook authentication
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret-change-in-production';

/**
 * Webhook endpoint for Python service to save file operations/actions
 * POST /api/projects/[id]/webhook/action
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
      type,
      path,
      status = 'completed',
      messageId = null,
    } = await request.json();

    if (!type || !path) {
      return NextResponse.json({ 
        error: 'Type and path are required' 
      }, { status: 400 });
    }

    // If no messageId provided, get the latest assistant message for this project
    let finalMessageId = messageId;
    if (!finalMessageId) {
      const latestMessage = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.projectId, projectId))
        .orderBy(desc(chatMessages.timestamp))
        .limit(1);
      
      if (latestMessage.length > 0) {
        finalMessageId = latestMessage[0].id;
      }
    }

    if (!finalMessageId) {
      return NextResponse.json({ 
        error: 'No message ID provided and no messages found for project' 
      }, { status: 400 });
    }

    // Save action to database
    const [savedAction] = await db.insert(actions).values({
      messageId: finalMessageId,
      type,
      path,
      status,
    }).returning();

    console.log(`✅ Webhook: Saved ${type} action for path ${path} in project ${projectId}`);

    return NextResponse.json({
      success: true,
      actionId: savedAction.id,
      timestamp: savedAction.timestamp,
    });
  } catch (error) {
    console.error('Error in action webhook:', error);
    return NextResponse.json(
      { error: 'Failed to save action' },
      { status: 500 }
    );
  }
} 