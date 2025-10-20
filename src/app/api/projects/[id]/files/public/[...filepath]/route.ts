import fs from 'fs/promises';
import mime from 'mime-types';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, filepath } = await params;
    const projectId = Number(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get the project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Construct the file path inside the project's public directory
    const filePath = path.join(process.cwd(), 'projects', projectId.toString(), 'public', ...filepath);

    // Check if the file exists
    try {
      await fs.access(filePath);
    } catch {
      console.error(`Public file not found: ${filePath}`);

      // Also try looking in the root directory as fallback
      const rootFilePath = path.join(process.cwd(), 'projects', projectId.toString(), ...filepath);

      try {
        await fs.access(rootFilePath);
        const fileContent = await fs.readFile(rootFilePath);
        const contentType = mime.lookup(rootFilePath) || 'application/octet-stream';

        return new NextResponse(fileContent, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          },
        });
      } catch {
        return NextResponse.json(
          { error: 'File not found in public directory' },
          { status: 404 }
        );
      }
    }

    // Read the file
    const fileContent = await fs.readFile(filePath);

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to get public file', message: errorMessage },
      { status: 500 }
    );
  }
}
