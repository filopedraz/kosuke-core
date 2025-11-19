import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { getDockerService } from '@/lib/docker';
import { deleteDir, getProjectPath } from '@/lib/fs/operations';
import { createKosukeOctokit, createUserOctokit } from '@/lib/github/client';
import { verifyProjectAccess } from '@/lib/projects';
import { tryCatch } from '@/lib/utils/try-catch';
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
      return ApiErrorHandler.unauthorized();
    }

    const { id: projectId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess || !project) {
      return ApiErrorHandler.projectNotFound();
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
      return ApiErrorHandler.unauthorized();
    }

    const { id: projectId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess, project, isOrgAdmin } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess || !project) {
      return ApiErrorHandler.projectNotFound();
    }

    // Only org admins can update project settings
    if (!isOrgAdmin) {
      return ApiErrorHandler.forbidden('Only organization admins can update project settings');
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
      return ApiErrorHandler.unauthorized();
    }

    const { id: projectId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess, project, isOrgAdmin } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess || !project) {
      return ApiErrorHandler.projectNotFound();
    }

    // Only org admins can delete projects
    if (!isOrgAdmin) {
      return ApiErrorHandler.forbidden('Only organization admins can delete projects');
    }

    // Read delete options from request body (optional)
    let deleteRepo = false;
    const { data: bodyData } = await tryCatch(request.json());

    if (bodyData) {
      deleteRepo = Boolean(bodyData.deleteRepo);
    }
    
    // Step 1: Stop all preview containers for this project before file deletion
    console.log(`Stopping all preview containers for project ${projectId} before deletion`);
    const dockerService = getDockerService();
    const { data: cleanupResult, error: previewError } = await tryCatch(
      dockerService.stopAllProjectPreviews(projectId)
    );

    if (previewError) {
      // Log but continue - we still want to proceed even if stopping previews fails
      console.error(`Error stopping preview containers for project ${projectId}:`, previewError);
      console.log(`Continuing with project deletion despite preview cleanup failure`);
    } else {
      console.log(
        `Preview cleanup completed for project ${projectId}: ` +
        `${cleanupResult.stopped} stopped, ${cleanupResult.failed} failed`
      );

      if (cleanupResult.failed > 0) {
        console.warn(
          `Some containers failed to stop for project ${projectId}. ` +
          `Manual cleanup may be required.`
        );
      }
    }

    // Step 2: Delete project files after containers are stopped
    const projectDir = getProjectPath(projectId);
    let filesWarning = null;

    const { error: dirError } = await tryCatch(deleteDir(projectDir));

    if (dirError) {
      console.error(`Error deleting project directory: ${projectDir}`, dirError);
      filesWarning = "Project deleted but some files could not be removed";
    } else {
      console.log(`Successfully deleted project directory: ${projectDir}`);
    }

    // Step 3: Optionally delete the associated GitHub repository
    if (deleteRepo && project.githubOwner && project.githubRepoName) {
      const kosukeOrg = process.env.NEXT_PUBLIC_GITHUB_WORKSPACE;
      const isKosukeRepo = project.githubOwner === kosukeOrg;

      const github = isKosukeRepo
        ? createKosukeOctokit()
        : await createUserOctokit(userId);

      const { error: ghError } = await tryCatch(
        github.rest.repos.delete({
          owner: project.githubOwner,
          repo: project.githubRepoName,
        })
      );

      if (ghError) {
        console.error('Error deleting GitHub repository:', ghError);
        // Continue with project deletion even if GitHub deletion fails
      } else {
        console.log(`Deleted GitHub repository ${project.githubOwner}/${project.githubRepoName}`);
      }
    }

    // Step 4: Archive the project
    const [archivedProject] = await db.update(projects).set({ isArchived: true, updatedAt: new Date() }).where(eq(projects.id, projectId)).returning();

    return ApiResponseHandler.success({
      ...archivedProject,
      ...(filesWarning && { warning: filesWarning }),
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
