import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { eq } from 'drizzle-orm';

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
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
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
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
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
    const updateData = { ...result.data, updatedAt: new Date() };
    const [updatedProject] = await db.update(projects).set(updateData).where(eq(projects.id, projectId)).returning();

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
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    // Check if the user has access to the project
    if (project.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Read delete options from request body (optional)
    let deleteRepo = false;
    try {
      const body = await request.json();
      deleteRepo = Boolean(body?.deleteRepo);
    } catch {
      // No body provided; keep defaults
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

    // Optionally delete the associated GitHub repository
    if (deleteRepo && project.githubOwner && project.githubRepoName) {
      try {
        const githubToken = await getGitHubToken(userId);
        if (!githubToken) {
          console.warn('GitHub token not found; skipping repository deletion');
        } else {
          const apiUrl = `https://api.github.com/repos/${project.githubOwner}/${project.githubRepoName}`;
          const ghResponse = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: 'application/vnd.github+json',
            },
          });
          if (ghResponse.ok) {
            console.log(`Deleted GitHub repository ${project.githubOwner}/${project.githubRepoName}`);
          } else {
            const errText = await ghResponse.text();
            console.error('Failed to delete GitHub repository:', ghResponse.status, errText);
          }
        }
      } catch (ghError) {
        console.error('Error deleting GitHub repository:', ghError);
      }
    }

    // Archive the project
    const [archivedProject] = await db.update(projects).set({ isArchived: true, updatedAt: new Date() }).where(eq(projects.id, projectId)).returning();

    return ApiResponseHandler.success(archivedProject);
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
