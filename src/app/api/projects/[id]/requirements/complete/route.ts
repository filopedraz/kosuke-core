import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/server';
import { AGENT_SERVICE_URL } from '@/lib/constants';
import { db } from '@/lib/db/drizzle';
import { getProjectEnvironmentVariables } from '@/lib/db/queries';
import { chatSessions, projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { cleanupProjectWorkspace, docsExist } from '@/lib/requirements/claude-requirements';
import { commitDocsToGitHub } from '@/lib/requirements/github-commit';
import { and, eq } from 'drizzle-orm';

/**
 * POST /api/projects/[id]/requirements/complete
 * Mark requirements gathering as complete and transition project to active status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if project is in requirements status
    if (project.status !== 'requirements') {
      return NextResponse.json(
        { error: 'Project is not in requirements gathering mode' },
        { status: 400 }
      );
    }

    // Verify docs.md exists in local workspace
    if (!docsExist(projectId)) {
      return NextResponse.json(
        { error: 'Requirements document (docs.md) not found. Please complete requirements gathering first.' },
        { status: 400 }
      );
    }

    // Get GitHub token for committing
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 400 }
      );
    }

    // Commit docs.md to GitHub repository
    const commitResult = await commitDocsToGitHub(
      projectId,
      githubToken,
      project.githubOwner!,
      project.githubRepoName!,
      project.defaultBranch || 'main'
    );

    if (!commitResult.success) {
      return NextResponse.json(
        { error: `Failed to commit docs.md to GitHub: ${commitResult.error}` },
        { status: 500 }
      );
    }

    console.log(`✅ docs.md committed to GitHub: ${commitResult.commitSha}`);

    // Use transaction to update project status and archive requirements session
    const updatedProject = await db.transaction(async (tx) => {
      // Update project status to active
      const [updated] = await tx
        .update(projects)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning();

      // Archive the requirements session
      await tx
        .update(chatSessions)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(chatSessions.projectId, projectId),
            eq(chatSessions.isRequirementsSession, true)
          )
        );

      return updated;
    });

    // NOW initialize Python agent environment for the default branch
    // This happens after requirements are complete
    try {
      const envVars = await getProjectEnvironmentVariables(projectId);
      const defaultBranch = project.defaultBranch || 'main';

      const initResponse = await fetch(`${AGENT_SERVICE_URL}/api/preview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          session_id: defaultBranch,
          env_vars: envVars,
        }),
      });

      if (!initResponse.ok) {
        console.warn('Failed to initialize Python agent environment:', await initResponse.text());
        // Don't fail completion if environment init fails
      } else {
        console.log(`✅ Python agent environment initialized for ${defaultBranch}`);
      }
    } catch (initError) {
      console.warn('Error initializing Python agent environment:', initError);
      // Don't fail completion
    }

    // Clean up local workspace after successful completion
    try {
      cleanupProjectWorkspace(projectId);
      console.log(`✅ Cleaned up local workspace for project ${projectId}`);
    } catch (cleanupError) {
      console.warn('Error cleaning up workspace:', cleanupError);
      // Don't fail completion if cleanup fails
    }

    return NextResponse.json({
      success: true,
      message: 'Requirements completed successfully',
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error completing requirements:', error);
    return NextResponse.json(
      { error: 'Failed to complete requirements' },
      { status: 500 }
    );
  }
}

