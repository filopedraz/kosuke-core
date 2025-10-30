import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatSessions, projects } from '@/lib/db/schema';
import { getGitHubToken } from '@/lib/github/auth';
import { Octokit } from '@octokit/rest';
import { desc, eq } from 'drizzle-orm';

// Schema for creating a chat session
const createChatSessionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
});

// Types for merge status
interface BranchMergeStatus {
  isMerged: boolean;
  mergedAt: string | null;
  mergedBy: string | null;
  mergeCommitSha: string | null;
  pullRequestNumber: number | null;
}

interface PullRequestWithMergedBy {
  merged_by?: {
    login: string;
  } | null;
  merge_commit_sha: string | null;
}

/**
 * Check if a branch has been merged using GitHub API via Octokit
 */
async function checkBranchMergeStatus(
  github: Octokit,
  owner: string,
  repo: string,
  branchName: string
): Promise<BranchMergeStatus> {
  try {
    // Search for pull requests from this branch (all states)
    const { data: pullRequests } = await github.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 10, // Limit to most recent 10 PRs
    });

    // Find the most recent merged PR from this branch
    const mergedPR = pullRequests.find(pr => pr.merged_at !== null);

    if (mergedPR) {
      // Get detailed PR info to access merged_by
      const { data: prDetails } = await github.rest.pulls.get({
        owner,
        repo,
        pull_number: mergedPR.number,
      });

      return {
        isMerged: true,
        mergedAt: mergedPR.merged_at,
        mergedBy: (prDetails as PullRequestWithMergedBy).merged_by?.login || null,
        mergeCommitSha: prDetails.merge_commit_sha,
        pullRequestNumber: mergedPR.number,
      };
    }

    return {
      isMerged: false,
      mergedAt: null,
      mergedBy: null,
      mergeCommitSha: null,
      pullRequestNumber: null,
    };
  } catch (error) {
    console.error('Error checking merged pull requests:', error);
    return {
      isMerged: false,
      mergedAt: null,
      mergedBy: null,
      mergeCommitSha: null,
      pullRequestNumber: null,
    };
  }
}

/**
 * GET /api/projects/[id]/chat-sessions
 * List all chat sessions for a project
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

    // Verify project access
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

    // Get all chat sessions for the project
    let sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.projectId, projectId))
      .orderBy(desc(chatSessions.lastActivityAt));

    // Return sessions (empty array if none exist)
    // No automatic creation of default session

    // Check and update merge status for sessions with GitHub branches
    if (project.githubOwner && project.githubRepoName) {
      try {
        const githubToken = await getGitHubToken(userId);
        if (githubToken) {
          const github = new Octokit({ auth: githubToken });

          // Check merge status for sessions that have branches but no merge info yet
          const sessionsToUpdate = sessions.filter(session =>
            !!session.sessionId &&
            !session.branchMergedAt // Only check if not already marked as merged
          );

          // Process sessions in parallel but limit concurrency
          const updatePromises = sessionsToUpdate.map(async (session) => {
            try {
              const mergeStatus = await checkBranchMergeStatus(
                github,
                project.githubOwner!,
                project.githubRepoName!,
                session.sessionId
              );

              if (mergeStatus.isMerged) {
                // Update session in database with merge information
                const [updatedSession] = await db
                  .update(chatSessions)
                  .set({
                    branchMergedAt: mergeStatus.mergedAt ? new Date(mergeStatus.mergedAt) : null,
                    branchMergedBy: mergeStatus.mergedBy,
                    mergeCommitSha: mergeStatus.mergeCommitSha,
                    pullRequestNumber: mergeStatus.pullRequestNumber,
                    updatedAt: new Date(),
                  })
                  .where(eq(chatSessions.id, session.id))
                  .returning();

                return updatedSession;
              }
              return session;
            } catch (error) {
              console.error(`Error checking merge status for session ${session.id}:`, error);
              return session; // Return original session if merge check fails
            }
          });

          // Wait for all updates to complete
          const updatedSessions = await Promise.all(updatePromises);

          // Replace sessions with updated versions
          sessions = sessions.map(session => {
            const updated = updatedSessions.find(u => u?.id === session.id);
            return updated || session;
          });
        }
      } catch (error) {
        console.error('Error checking merge status for sessions:', error);
        // Continue without merge status updates if GitHub integration fails
      }
    }

    return NextResponse.json({
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get chat sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/chat-sessions
 * Create a new chat session
 */
export async function POST(
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

    // Verify project access
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
    const parseResult = createChatSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: z.treeifyError(parseResult.error) },
        { status: 400 }
      );
    }

    const { title, description } = parseResult.data;

    // Generate canonical sessionId (prefixed) for branch parity
    const randomPart = Math.random().toString(36).slice(2, 8);
    // Use URL-safe session id (no slashes). Git branch will map this to 'kosuke/chat-*'.
    const sessionId = `kosuke-chat-${randomPart}`;

    // Create chat session
    const [newSession] = await db
      .insert(chatSessions)
      .values({
        projectId,
        userId,
        title,
        description,
        sessionId,
        status: 'active',
        messageCount: 0,
        isDefault: false,
      })
      .returning();

    return NextResponse.json({
      session: newSession,
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}
