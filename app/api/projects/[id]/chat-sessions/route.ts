import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatSessions, projects } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

// Schema for creating a chat session
const createChatSessionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
});

/**
 * GET /api/projects/[id]/chat-sessions
 * List all chat sessions for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    // Get all chat sessions for the project
    let sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.projectId, projectId))
      .orderBy(desc(chatSessions.lastActivityAt));

    // If no sessions exist, create a default session
    if (sessions.length === 0) {
      const sessionId = Math.random().toString(36).substr(2, 6);
      const [defaultSession] = await db
        .insert(chatSessions)
        .values({
          projectId,
          userId,
          title: 'Main Conversation',
          sessionId,
          githubBranchName: `kosuke/chat-${sessionId}`,
          status: 'active',
          isDefault: true,
          messageCount: 0,
        })
        .returning();

      sessions = [defaultSession];
      console.log(`✅ Created default session for project ${projectId}: ${sessionId}`);
    }

    return NextResponse.json({
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get chat sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/chat-sessions
 * Create a new chat session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    // Parse request body
    const body = await request.json();
    const parseResult = createChatSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { title, description } = parseResult.data;

    // Generate unique session ID (max 6 characters)
    const sessionId = Math.random().toString(36).substr(2, 6);
    const githubBranchName = `kosuke/chat-${sessionId}`;

    // Create chat session
    const [newSession] = await db
      .insert(chatSessions)
      .values({
        projectId,
        userId,
        title,
        description,
        sessionId,
        githubBranchName,
        status: 'active',
        messageCount: 0,
        isDefault: false,
      })
      .returning();

    return NextResponse.json({
      session: newSession,
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}
