import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatSessions, projects } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * GET /api/projects/[id]/requirements/session
 * Get the requirements gathering session for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the requirements session
    const [requirementsSession] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.projectId, projectId),
          eq(chatSessions.isRequirementsSession, true)
        )
      );

    if (!requirementsSession) {
      return NextResponse.json(
        { error: 'Requirements session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session: requirementsSession,
    });
  } catch (error) {
    console.error('Error getting requirements session:', error);
    return NextResponse.json(
      { error: 'Failed to get requirements session' },
      { status: 500 }
    );
  }
}

