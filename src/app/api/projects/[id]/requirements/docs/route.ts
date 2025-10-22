import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { docsExist, readDocs } from '@/lib/requirements/claude-requirements';
import { eq } from 'drizzle-orm';

/**
 * GET /api/projects/[id]/requirements/docs
 * Read docs.md from the local project workspace
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

    // Check if project is in requirements status
    if (project.status !== 'requirements') {
      return NextResponse.json(
        { error: 'Project is not in requirements gathering mode' },
        { status: 400 }
      );
    }

    // Check if docs.md exists in local workspace
    if (!docsExist(projectId)) {
      return NextResponse.json({
        content: '',
        exists: false,
      });
    }

    // Read docs.md from local workspace
    const content = readDocs(projectId);

    return NextResponse.json({
      content: content || '',
      exists: true,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error('Error reading requirements docs:', error);
    return NextResponse.json(
      { error: 'Failed to read requirements document' },
      { status: 500 }
    );
  }
}


