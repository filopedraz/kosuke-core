import mime from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { getFileContent } from '@/lib/fs/operations';
import { eq } from 'drizzle-orm';
import { ApiErrorHandler } from '@/lib/api/errors';
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

    const { id, filepath } = await params;
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
