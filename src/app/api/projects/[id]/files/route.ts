import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { getProjectFiles } from '@/lib/fs/operations';
import { verifyProjectAccess } from '@/lib/projects';

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

    const { id: projectId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
    }

    // Get the project files using the shared file operations
    const files = await getProjectFiles(projectId);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error getting project files:', error);
    return ApiErrorHandler.handle(error);
  }
}

