import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { Octokit } from '@octokit/rest';
import { eq } from 'drizzle-orm';

// Schema for updating default branch
const updateDefaultBranchSchema = z.object({
  default_branch: z.string().min(1, 'Default branch is required'),
});

/**
 * GET /api/projects/[id]/settings/default-branch
 * Get project default branch setting and available branches
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    let availableBranches: string[] = [];

    // Get available branches from GitHub if repository is connected
    if (project.githubOwner && project.githubRepoName) {
      try {
        const githubToken = await getGitHubToken(userId);
        if (githubToken) {
          const github = new Octokit({
            auth: githubToken,
          });

          const { data: branches } = await github.rest.repos.listBranches({
            owner: project.githubOwner,
            repo: project.githubRepoName,
          });

          availableBranches = branches.map(branch => branch.name);
        }
      } catch (error) {
        console.warn('Failed to fetch GitHub branches:', error);
        // Continue without branches if GitHub fetch fails
      }
    }

    return NextResponse.json({
      default_branch: project.defaultBranch,
      available_branches: availableBranches,
    });
  } catch (error) {
    console.error('Error getting default branch settings:', error);
    return NextResponse.json(
      { error: 'Failed to get default branch settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/settings/default-branch
 * Update project default branch
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parseResult = updateDefaultBranchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: z.treeifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const { default_branch } = parseResult.data;

    // Validate branch exists if GitHub repo is connected
    if (project.githubOwner && project.githubRepoName) {
      try {
        const githubToken = await getGitHubToken(userId);
        if (githubToken) {
          const github = new Octokit({
            auth: githubToken,
          });

          // Check if branch exists
          await github.rest.repos.getBranch({
            owner: project.githubOwner,
            repo: project.githubRepoName,
            branch: default_branch,
          });
        }
      } catch {
        return NextResponse.json(
          { error: `Branch '${default_branch}' not found in repository` },
          { status: 400 }
        );
      }
    }

    // Update project default branch
    const [updatedProject] = await db
      .update(projects)
      .set({
        defaultBranch: default_branch,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    return NextResponse.json({
      default_branch: updatedProject.defaultBranch,
      success: true,
    });
  } catch (error) {
    console.error('Error updating default branch:', error);
    return NextResponse.json(
      { error: 'Failed to update default branch' },
      { status: 500 }
    );
  }
}
