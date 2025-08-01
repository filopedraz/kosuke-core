import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth/server';
import { archiveProject, getProjectById, updateProject } from '@/lib/db/projects';

// Schema for updating a project
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
});

/**
 * GET /api/projects/[id]
 * Get a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return ApiResponseHandler.success(project);
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

/**
 * PATCH /api/projects/[id]
 * Update a project
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse the request body
    const body = await request.json();

    // Validate the request body
    const result = updateProjectSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }

    // Update the project
    const updatedProject = await updateProject(projectId, result.data);

    return ApiResponseHandler.success(updatedProject);
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

/**
 * DELETE /api/projects/[id]
 * Archive a project (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // First, try to stop the project preview if it's running
    try {
      console.log(`Stopping preview for project ${projectId} before archiving`);

      // Proxy stop request to Python agent
      const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${agentUrl}/api/preview/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (response.ok) {
        console.log(`Preview for project ${projectId} stopped successfully`);
      } else {
        console.log(`Preview stop request failed, but continuing with archive`);
      }
    } catch (previewError) {
      // Log but continue - we still want to archive the project even if stopping the preview fails
      console.error(`Error stopping preview for project ${projectId}:`, previewError);
    }

    // Archive the project
    const archivedProject = await archiveProject(projectId);

    return ApiResponseHandler.success(archivedProject);
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
