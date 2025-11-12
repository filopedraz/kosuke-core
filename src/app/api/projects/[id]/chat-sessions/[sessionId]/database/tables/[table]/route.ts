import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import { verifyProjectAccess } from '@/lib/projects';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string; table: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId, table } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    if (!sessionId) {
      return ApiErrorHandler.badRequest('Session ID is required');
    }

    const tableName = table;
    if (!tableName) {
      return ApiErrorHandler.badRequest('Table name is required');
    }

    // Verify user has access to project through organization membership
    const { hasAccess } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
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
