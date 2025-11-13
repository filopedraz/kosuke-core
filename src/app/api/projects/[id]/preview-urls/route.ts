import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { getDockerService } from '@/lib/docker';
import { verifyProjectAccess } from '@/lib/projects';
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

    const { id: projectId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
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
