import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, projects } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects/[id]/messages/latest
 * Get the latest message for a project - used for preview refresh polling
 */
export async function GET(
  _request: NextRequest,
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

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get the latest message
    const latestMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId))
      .orderBy(desc(chatMessages.timestamp))
      .limit(1);

    if (latestMessages.length === 0) {
      return NextResponse.json({
        message: null,
        timestamp: null
      });
    }

    const latestMessage = latestMessages[0];

    // Return the timestamp of the latest message
    return NextResponse.json({
      id: latestMessage.id,
      role: latestMessage.role,
      timestamp: latestMessage.timestamp
    });
  } catch (error) {
    console.error('Error getting latest message:', error);
    return NextResponse.json(
      { error: 'Failed to get latest message' },
      { status: 500 }
    );
  }
}
