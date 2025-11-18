import fs from 'fs/promises';
import mime from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { verifyProjectAccess } from '@/lib/projects';
import { tryCatch } from '@/lib/utils/try-catch';

/**
 * GET /api/projects/[id]/files/public/[...filepath]
 * Get the content of a static file from the project's public directory
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

    // Construct the file path inside the project's public directory
    const filePath = path.join(process.cwd(), 'projects', projectId.toString(), 'public', ...filepath);

    // Check if the file exists in public directory
    const { error: publicAccessError } = await tryCatch(fs.access(filePath));

    if (publicAccessError) {
      console.error(`Public file not found: ${filePath}`);

      // Also try looking in the root directory as fallback
      const rootFilePath = path.join(process.cwd(), 'projects', projectId.toString(), ...filepath);

      const { error: rootAccessError } = await tryCatch(fs.access(rootFilePath));

      if (rootAccessError) {
        return ApiErrorHandler.notFound('File not found in public directory');
      }

      // File found in root, read it
      const { data: fileContent, error: readError } = await tryCatch(fs.readFile(rootFilePath));

      if (readError) {
        return ApiErrorHandler.notFound('File not found in public directory');
      }

      const contentType = mime.lookup(rootFilePath) || 'application/octet-stream';

      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      });
    }

    // Read the file from public directory
    const { data: fileContent, error: readError } = await tryCatch(fs.readFile(filePath));

    if (readError) {
      return ApiErrorHandler.notFound('File not found or cannot be read');
    }

    // Determine the content type
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    // Return the file content with caching headers for static assets
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error: unknown) {
    console.error('Error getting public file:', error);
    return ApiErrorHandler.handle(error);
  }
}
