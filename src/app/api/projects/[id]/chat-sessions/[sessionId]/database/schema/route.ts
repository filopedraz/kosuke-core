import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import { verifyProjectAccess } from '@/lib/projects';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    if (!sessionId) {
      return ApiErrorHandler.badRequest('Session ID is required');
    }

    // Verify user has access to project through organization membership
    const { hasAccess } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
    }

    console.log(`📊 Getting database schema for project ${projectId}, session ${sessionId}`);

    // Get database schema using DatabaseService
    const dbService = new DatabaseService(projectId, sessionId);
    const schema = await dbService.getSchema();

    return NextResponse.json(schema);
  } catch (error) {
    console.error('Error fetching database schema:', error);
    return ApiErrorHandler.handle(error);
  }
}
