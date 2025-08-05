import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';


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
      .where(eq(projects.userId, userId))
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
 * Helper function to create a GitHub repository
 */
async function createGitHubRepository(
  githubToken: string,
  repositoryName: string,
  description: string,
  isPrivate: boolean,
  projectId: number
) {
  const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

  const response = await fetch(`${agentUrl}/api/github/create-repo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Token': githubToken,
    },
    body: JSON.stringify({
      name: repositoryName,
      description: description || '',
      private: isPrivate || false,
      auto_init: true,
      project_id: projectId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create repository: ${error}`);
  }

  const repoData = await response.json();

  // After creating repository, clone it locally for preview
  const cloneResponse = await fetch(`${agentUrl}/api/github/clone-repo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Token': githubToken,
    },
    body: JSON.stringify({
      repo_url: repoData.url,
      project_id: projectId,
    }),
  });

  if (!cloneResponse.ok) {
    const cloneError = await cloneResponse.text();
    throw new Error(`Failed to clone repository locally: ${cloneError}`);
  }

  return repoData;
}

/**
 * Helper function to import a GitHub repository
 */
async function importGitHubRepository(
  githubToken: string,
  repositoryUrl: string,
  projectId: number
) {
  const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

  // First get repo info
  const infoResponse = await fetch(
    `${agentUrl}/api/github/repo-info?repo_url=${encodeURIComponent(repositoryUrl)}`,
    {
      headers: {
        'X-GitHub-Token': githubToken,
      },
    }
  );

  if (!infoResponse.ok) {
    throw new Error('Invalid repository URL');
  }

  const repoInfo = await infoResponse.json();

  // Import repository
  const importResponse = await fetch(`${agentUrl}/api/github/import-repo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Token': githubToken,
    },
    body: JSON.stringify({
      repo_url: repositoryUrl,
      project_id: projectId,
    }),
  });

  if (!importResponse.ok) {
    const error = await importResponse.text();
    throw new Error(`Failed to import repository: ${error}`);
  }

  return { repoInfo, importResult: await importResponse.json() };
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

    // Get user's GitHub token
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please connect your GitHub account first.' },
        { status: 400 }
      );
    }

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
            githubToken,
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
            githubToken,
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
