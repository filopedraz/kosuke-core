import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { getDockerService } from '@/lib/docker';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects/[id]/preview-urls
 * Get all preview URLs (containers) for a project
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return ApiErrorHandler.badRequest('Invalid project ID');
    }

    // Get project and verify ownership
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

    if (!project) {
      return ApiErrorHandler.projectNotFound();
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // Get preview URLs from Docker service
    console.log(`Fetching preview URLs for project ${projectId}`);
    const dockerService = getDockerService();
    const result = await dockerService.getProjectPreviewUrls(projectId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching project preview URLs:', error);
    return ApiErrorHandler.serverError(error);
  }
}
