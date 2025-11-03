import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || project.userId !== userId) {
      return ApiErrorHandler.projectNotFound();
    }

    console.log(`📊 Getting database info for project ${projectId}, session ${sessionId}`);

    // Get database info using DatabaseService
    const dbService = new DatabaseService(projectId, sessionId);
    const info = await dbService.getDatabaseInfo();

    return NextResponse.json(info);
  } catch (error) {
    console.error('Error fetching database info:', error);
    return ApiErrorHandler.handle(error);
  }
}
