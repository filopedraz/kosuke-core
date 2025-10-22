import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatSessions, projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { cleanupProjectWorkspace, docsExist } from '@/lib/requirements/claude-requirements';
import { generateProjectEstimateWithRetry } from '@/lib/requirements/estimate-project';
import { commitDocsToGitHub } from '@/lib/requirements/github-commit';
import { and, eq } from 'drizzle-orm';

/**
 * POST /api/projects/[id]/requirements/complete
 * Mark requirements gathering as complete, generate estimate, and transition project to ready status
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

    // Generate project estimate using Claude AI
    console.log(`🤖 Generating project estimate for project ${projectId}...`);
    let estimate;
    try {
      estimate = await generateProjectEstimateWithRetry(projectId);
      console.log(`✅ Estimate generated:`, estimate);
    } catch (estimateError) {
      console.error('Failed to generate project estimate:', estimateError);
      return NextResponse.json(
        { error: 'Failed to generate project estimate. Please try again.' },
        { status: 500 }
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
      // Update project status to ready and store estimate
      const [updated] = await tx
        .update(projects)
        .set({
          status: 'ready',
          estimateComplexity: estimate.complexity,
          estimateAmount: estimate.amount,
          estimateReasoning: estimate.reasoning,
          estimateGeneratedAt: new Date(),
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
      estimate: {
        complexity: estimate.complexity,
        amount: estimate.amount,
        timeline: estimate.timeline,
        reasoning: estimate.reasoning,
      },
    });
  } catch (error) {
    console.error('Error completing requirements:', error);
    return NextResponse.json(
      { error: 'Failed to complete requirements' },
      { status: 500 }
    );
  }
}

