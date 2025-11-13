import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { SESSION_BRANCH_PREFIX } from '@/lib/constants';
import { db } from '@/lib/db/drizzle';
import { chatSessions } from '@/lib/db/schema';
import { createKosukeOctokit, createUserOctokit } from '@/lib/github/client';
import { verifyProjectAccess } from '@/lib/projects';
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
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = Number(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    // Verify user has access to project through organization membership
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess || !project) {
      return ApiErrorHandler.forbidden();
    }

    // Verify GitHub repository is connected
    if (!project.githubOwner || !project.githubRepoName) {
      return ApiErrorHandler.badRequest('Project is not connected to a GitHub repository');
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
      return ApiErrorHandler.chatSessionNotFound();
    }

    // Parse request body
    const body = await request.json();
    const parseResult = createPullRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiErrorHandler.validationError(parseResult.error);
    }

    const { title, description, target_branch } = parseResult.data;

    // Set defaults
    const sourceBranch = `${SESSION_BRANCH_PREFIX}${session.sessionId}`;
    const targetBranch = target_branch || project.defaultBranch || 'main';
    const prTitle = title || `Updates from chat session: ${session.title}`;
    const prDescription = description || `Automated changes from Kosuke chat session: ${session.title}\n\nSession ID: ${sessionId}`;

    try {
      // Get GitHub client based on project ownership
      const kosukeOrg = process.env.NEXT_PUBLIC_KOSUKE_ORG;
      const isKosukeRepo = project.githubOwner === kosukeOrg;

      const github = isKosukeRepo
        ? createKosukeOctokit()
        : await createUserOctokit(userId);

      // Check if source branch exists
      try {
        await github.rest.repos.getBranch({
          owner: project.githubOwner,
          repo: project.githubRepoName,
          branch: sourceBranch,
        });
      } catch {
        return ApiErrorHandler.badRequest(`Source branch '${sourceBranch}' not found. Make sure the chat session has made changes and committed them.`);
      }

      // Check if target branch exists
      try {
        await github.rest.repos.getBranch({
          owner: project.githubOwner,
          repo: project.githubRepoName,
          branch: targetBranch,
        });
      } catch {
        return ApiErrorHandler.badRequest(`Target branch '${targetBranch}' not found`);
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
      return ApiErrorHandler.handle(error);
    }
  } catch (error) {
    console.error('Error in pull request creation:', error);
    return ApiErrorHandler.handle(error);
  }
}
