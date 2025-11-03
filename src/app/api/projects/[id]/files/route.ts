import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { getProjectFiles } from '@/lib/fs/operations';
import { eq } from 'drizzle-orm';
import { ApiErrorHandler } from '@/lib/api/errors';

/**
 * GET /api/projects/[id]/files
 * Get files for a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    // Get the project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return ApiErrorHandler.projectNotFound();
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // Get the project files using the shared file operations
    const files = await getProjectFiles(projectId);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error getting project files:', error);
    return ApiErrorHandler.handle(error);
  }
}

