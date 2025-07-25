import { NextRequest, NextResponse } from 'next/server';
import { inArray, sql, eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { actions } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs';

interface ActionOperation {
  messageId: number;
  type: string;
  path: string;
  status?: string;
  id?: number;
  timestamp?: Date;
}

/**
 * GET /api/projects/[id]/actions
 * 
 * Get all operations for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  console.log('GET request to /api/projects/[id]/actions with id:', id);

  try {
    // Get the session
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the project belongs to the user
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, id),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all messages for the project to find their IDs
    const messages = await db.query.chatMessages.findMany({
      where: (chatMessages, { eq }) => eq(chatMessages.projectId, id),
    });

    if (messages.length === 0) {
      return NextResponse.json({ operations: [] });
    }

    // Extract message IDs
    const messageIds = messages.map(message => message.id);

    // Get all operations for these messages
    const operations = await db
      .select()
      .from(actions)
      .where(inArray(actions.messageId, messageIds))
      .orderBy(sql`${actions.timestamp} DESC`);

    return NextResponse.json({ operations });
  } catch (error) {
    console.error('Error getting actions:', error);
    return NextResponse.json(
      { error: 'Failed to get actions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/actions
 * 
 * Create or update operations for a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  console.log('POST request to /api/projects/[id]/actions with id:', id);

  try {
    // Get the session
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the project belongs to the user
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, id),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the operations from the request body
    const { operations } = await request.json() as { operations: ActionOperation[] };

    // Validate the operations
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: 'Invalid operations format' },
        { status: 400 }
      );
    }

    // Get all messages for the project to verify messageIds
    const messages = await db.query.chatMessages.findMany({
      where: (chatMessages, { eq }) => eq(chatMessages.projectId, id),
    });

    // Extract message IDs for validation
    const messageIds = messages.map(message => message.id);

    // Verify all messageIds belong to this project
    for (const op of operations) {
      if (!messageIds.includes(op.messageId)) {
        return NextResponse.json(
          { error: `Invalid messageId: ${op.messageId}` },
          { status: 400 }
        );
      }
    }

    // Clear existing operations to avoid duplicates (optional based on your needs)
    // First check if we're updating all operations for these messages
    // If we're updating all operations, we can delete them all first
    await db.delete(actions).where(inArray(actions.messageId, messageIds));

    // Prepare a transaction to insert all operations
    const result = [];
    for (const op of operations) {
      // Check if the operation already exists
      const existing = await db
        .select()
        .from(actions)
        .where(
          and(
            eq(actions.messageId, op.messageId),
            eq(actions.path, op.path),
            eq(actions.type, op.type)
          )
        )
        .limit(1);

      // Update or insert
      let operation;
      if (existing.length > 0) {
        // Update existing operation
        operation = await db.update(actions)
          .set({
            status: op.status || 'completed',
            timestamp: new Date(),
          })
          .where(eq(actions.id, existing[0].id))
          .returning();
      } else {
        // Insert new operation
        operation = await db.insert(actions)
          .values({
            messageId: op.messageId,
            type: op.type,
            path: op.path,
            status: op.status || 'completed',
            timestamp: new Date(),
          })
          .returning();
      }

      result.push(operation[0]);
    }

    return NextResponse.json({ operations: result });
  } catch (error) {
    console.error('Error updating operations:', error);
    return NextResponse.json(
      { error: 'Failed to update operations' },
      { status: 500 }
    );
  }
} 