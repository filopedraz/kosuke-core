import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth/server';
import { SESSION_BRANCH_PREFIX } from '@/lib/constants';
import { db } from '@/lib/db/drizzle';
import { chatSessions, projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { Octokit } from '@octokit/rest';
import { and, eq } from 'drizzle-orm';

// Schema for creating pull request
const createPullRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  target_branch: z.string().optional(),
});

/**
 * POST /api/projects/[id]/chat-sessions/[sessionId]/pull-request
 * Create pull request from chat session branch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, sessionId } = await params;
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

    // Verify GitHub repository is connected
    if (!project.githubOwner || !project.githubRepoName) {
      return NextResponse.json(
        { error: 'Project is not connected to a GitHub repository' },
        { status: 400 }
      );
    }

    // Get chat session
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.projectId, projectId),
          eq(chatSessions.sessionId, sessionId)
        )
      );

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Get GitHub token
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not found. Please connect your GitHub account.' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parseResult = createPullRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { title, description, target_branch } = parseResult.data;

    // Set defaults
    const sourceBranch = `${SESSION_BRANCH_PREFIX}${session.sessionId}`;
    const targetBranch = target_branch || project.defaultBranch || 'main';
    const prTitle = title || `Updates from chat session: ${session.title}`;
    const prDescription = description || `Automated changes from Kosuke chat session: ${session.title}\n\nSession ID: ${sessionId}`;

    try {
      const github = new Octokit({
        auth: githubToken,
      });

      // Check if source branch exists
      try {
        await github.rest.repos.getBranch({
          owner: project.githubOwner,
          repo: project.githubRepoName,
          branch: sourceBranch,
        });
      } catch {
        return NextResponse.json(
          { error: `Source branch '${sourceBranch}' not found. Make sure the chat session has made changes and committed them.` },
          { status: 400 }
        );
      }

      // Check if target branch exists
      try {
        await github.rest.repos.getBranch({
          owner: project.githubOwner,
          repo: project.githubRepoName,
          branch: targetBranch,
        });
      } catch {
        return NextResponse.json(
          { error: `Target branch '${targetBranch}' not found` },
          { status: 400 }
        );
      }

      // Generate GitHub PR creation URL
      const encodedTitle = encodeURIComponent(prTitle);
      const encodedBody = encodeURIComponent(prDescription);

      const githubPrUrl = `https://github.com/${project.githubOwner}/${project.githubRepoName}/compare/${targetBranch}...${sourceBranch}?quick_pull=1&title=${encodedTitle}&body=${encodedBody}`;

      return NextResponse.json({
        pull_request_url: githubPrUrl,
        source_branch: sourceBranch,
        target_branch: targetBranch,
        title: prTitle,
        success: true,
      });

    } catch (error: unknown) {
      console.error('Error preparing pull request:', error);

      return NextResponse.json(
        { error: 'Failed to prepare pull request' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in pull request creation:', error);
    return NextResponse.json(
      { error: 'Failed to create pull request' },
      { status: 500 }
    );
  }
}
