import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { createRepositoryFromTemplate } from '@/lib/github';
import { getGitHubToken } from '@/lib/github/auth';
import { GitOperations } from '@/lib/github/git-operations';


// Schema for project creation with GitHub integration
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(1),
  github: z.object({
    type: z.enum(['create', 'import']),
    repositoryName: z.string().optional(),
    repositoryUrl: z.string().optional(),
    description: z.string().optional(),
    isPrivate: z.boolean().optional(),
  }),
});

/**
 * GET /api/projects
 * Get all projects for the current user
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query projects directly from database
    const userProjects = await db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.isArchived, false)))
      .orderBy(desc(projects.createdAt));

    return NextResponse.json(userProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to create a GitHub repository from template
 */
async function createGitHubRepository(
  userId: string,
  repositoryName: string,
  description: string,
  isPrivate: boolean,
  projectId: number
) {
  const templateRepo = process.env.TEMPLATE_REPOSITORY;
  if (!templateRepo) {
    throw new Error('TEMPLATE_REPOSITORY is not set');
  }

  // Create repository from template using Octokit
  const repoData = await createRepositoryFromTemplate(userId, {
    name: repositoryName,
    description,
    private: isPrivate,
    templateRepo,
  });

  // Wait for GitHub to initialize the repository (same as Python implementation)
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Clone the repository locally if project_id is provided
  try {
    // Get GitHub token for clone operation
    const githubToken = await getGitHubToken(userId);
    if (githubToken) {
      const gitOps = new GitOperations();
      await gitOps.cloneRepository(repoData.url, projectId, githubToken);
      console.log(`✅ Repository cloned successfully to project ${projectId}`);
    }
  } catch (cloneError) {
    console.error('Repository created but failed to clone locally:', cloneError);
    // Don't throw - repository was created successfully
  }

  return repoData;
}

/**
 * Helper function to import a GitHub repository
 * Parses repository URL, gets repo info, and clones it locally
 */
async function importGitHubRepository(
  userId: string,
  repositoryUrl: string,
  projectId: number
) {
  // Parse repository URL to get owner and repo name
  const urlMatch = repositoryUrl.match(/github\.com[/:]([\w-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (!urlMatch) {
    throw new Error('Invalid GitHub repository URL');
  }

  const [, owner, repo] = urlMatch;

  // Get repository info using Octokit
  const { createOctokit } = await import('@/lib/github/client');
  const octokit = await createOctokit(userId);

  try {
    const { data: repoInfo } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    // Clone repository locally
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      throw new Error('GitHub token not found');
    }

    const gitOps = new GitOperations();
    const projectPath = await gitOps.cloneRepository(repositoryUrl, projectId, githubToken);

    console.log(`✅ Repository imported successfully to ${projectPath}`);

    return {
      repoInfo: {
        owner: repoInfo.owner.login,
        name: repoInfo.name,
        full_name: repoInfo.full_name,
        clone_url: repoInfo.clone_url,
        default_branch: repoInfo.default_branch,
      },
      importResult: {
        success: true,
        project_id: projectId,
        project_path: projectPath,
      },
    };
  } catch (error) {
    console.error('Error importing repository:', error);
    if (error instanceof Error && error.message.includes('Not Found')) {
      throw new Error('Repository not found or not accessible');
    }
    throw error;
  }
}

/**
 * POST /api/projects
 * Create a new project with GitHub integration
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }

    const { name, github } = result.data;

    // Validate GitHub configuration based on type
    if (github.type === 'create' && !github.repositoryName) {
      return NextResponse.json(
        { error: 'Repository name is required for creating new repositories' },
        { status: 400 }
      );
    }

    if (github.type === 'import' && !github.repositoryUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required for importing repositories' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomicity
    const result_1 = await db.transaction(async (tx) => {
      // First create the project
      const [project] = await tx
        .insert(projects)
        .values({
          name: name,
          description: github.description || null,
          userId: userId,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      try {
        // Handle GitHub operations based on type
        if (github.type === 'create') {
          const repoData = await createGitHubRepository(
            userId,
            github.repositoryName!,
            github.description || '',
            github.isPrivate || false,
            project.id
          );

          // Update project with GitHub info
          const [updatedProject] = await tx
            .update(projects)
            .set({
              githubRepoUrl: repoData.url,
              githubOwner: repoData.owner,
              githubRepoName: repoData.name,
              lastGithubSync: new Date(),
            })
            .where(eq(projects.id, project.id))
            .returning();

          return updatedProject;
        } else {
          // Import mode
          const { repoInfo } = await importGitHubRepository(
            userId,
            github.repositoryUrl!,
            project.id
          );

          // Update project with GitHub info
          const [updatedProject] = await tx
            .update(projects)
            .set({
              githubRepoUrl: github.repositoryUrl,
              githubOwner: repoInfo.owner,
              githubRepoName: repoInfo.name,
              lastGithubSync: new Date(),
            })
            .where(eq(projects.id, project.id))
            .returning();

          return updatedProject;
        }
      } catch (githubError) {
        // If GitHub operation fails, the transaction will be rolled back
        throw githubError;
      }
    });

    return ApiResponseHandler.created({ project: result_1 });
  } catch (error) {
    console.error('Error creating project with GitHub integration:', error);

    // Return specific error messages for GitHub-related failures
    if (error instanceof Error) {
      if (error.message.includes('repository')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return ApiErrorHandler.handle(error);
  }
}
