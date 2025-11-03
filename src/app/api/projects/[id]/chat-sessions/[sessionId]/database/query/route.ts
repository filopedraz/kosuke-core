import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return ApiErrorHandler.badRequest('Query is required');
    }

    // Basic security check - only allow SELECT queries
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return ApiErrorHandler.badRequest('Only SELECT queries are allowed for security reasons');
    }

    console.log(`📊 Executing query for project ${projectId}, session ${sessionId}`);

    // Execute query using DatabaseService
    const dbService = new DatabaseService(projectId, sessionId);
    const result = await dbService.executeQuery(query);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing database query:', error);
    return ApiErrorHandler.handle(error);
  }
}
