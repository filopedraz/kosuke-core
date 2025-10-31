import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth/server';
import { DatabaseService } from '@/lib/database';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; table: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, sessionId, table } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const tableName = table;
    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    console.log(
      `📊 Getting table data for project ${projectId}, session ${sessionId}, table ${tableName}`
    );

    // Get table data using DatabaseService
    const dbService = new DatabaseService(projectId, sessionId);
    const tableData = await dbService.getTableData(tableName, limit, offset);

    return NextResponse.json(tableData);
  } catch (error) {
    console.error('Error fetching table data:', error);
    return ApiErrorHandler.handle(error);
  }
}
