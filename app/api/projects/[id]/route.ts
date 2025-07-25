import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { updateProject, archiveProject, getProjectById } from '@/lib/db/projects';

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.badRequest('Invalid project ID');
    }

    const project = await getProjectById(projectId);
    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.badRequest('Invalid project ID');
    }

    const project = await getProjectById(projectId);
    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // Parse the request body
    const body = await req.json();
    
    // Validate the request body
    const result = updateProjectSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }

    // Update the project
    const updatedProject = await updateProject(project.id, result.data);

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.badRequest('Invalid project ID');
    }

    const project = await getProjectById(projectId);
    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    // First, try to stop the project preview if it's running
    try {
      console.log(`Stopping preview for project ${project.id} before archiving`);
      
      // Proxy stop request to Python agent
      const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${agentUrl}/api/preview/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: project.id }),
      });

      if (response.ok) {
        console.log(`Preview for project ${project.id} stopped successfully`);
      } else {
        console.log(`Preview stop request failed, but continuing with archive`);
      }
    } catch (previewError) {
      // Log but continue - we still want to archive the project even if stopping the preview fails
      console.error(`Error stopping preview for project ${project.id}:`, previewError);
    }

    // Archive the project
    const archivedProject = await archiveProject(project.id);

    return ApiResponseHandler.success(archivedProject);
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
} 