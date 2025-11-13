import mime from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { getFileContent } from '@/lib/fs/operations';
import { verifyProjectAccess } from '@/lib/projects';
/**
 * GET /api/projects/[id]/files/[...filepath]
 * Get the content of a file in a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filepath: string[] }> }
) {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id: projectId, filepath } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
    }

    // Construct the relative file path
    const filePath = path.join(...filepath);

    try {
      // Get the file content using the shared file operations
      const fileContent = await getFileContent(projectId, filePath);

      // Determine the content type
      const contentType = mime.lookup(filePath) || 'application/octet-stream';

      // Return the file content
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': contentType,
        },
      });
    } catch (error) {
      console.error(`File not found or cannot be read: ${filePath}`, error);
      return ApiErrorHandler.notFound('File not found or cannot be read');
    }
  } catch (error: unknown) {
    console.error('Error getting file content:', error);
    return ApiErrorHandler.handle(error);
  }
}
