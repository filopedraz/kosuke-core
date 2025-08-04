import { NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import type { GitHubCommitWebhook } from '@/lib/types';

// Webhook authentication
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret-change-in-production';

/**
 * GitHub Commit Webhook Endpoint
 * POST /api/projects/[id]/webhook/commit
 * 
 * Receives commit notifications from the Python agent when files are
 * automatically committed to GitHub during AI sessions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify webhook authentication
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${WEBHOOK_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.error('Commit webhook authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project exists
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse commit webhook data
    const commitData: GitHubCommitWebhook = await request.json();

    if (!commitData.commit_sha || !commitData.commit_message) {
      return NextResponse.json(
        { error: 'Missing required commit data (commit_sha, commit_message)' },
        { status: 400 }
      );
    }

    console.log(`🔗 GitHub Commit Webhook: Project ${projectId}`, {
      sha: commitData.commit_sha.substring(0, 8),
      message: commitData.commit_message,
      filesChanged: commitData.files_changed,
      timestamp: commitData.timestamp,
    });

    // TODO: Future implementation could store commit history in database
    // For now, we just log the commit information

    // Return success response
    return NextResponse.json({
      success: true,
      projectId,
      commit: {
        sha: commitData.commit_sha,
        message: commitData.commit_message,
        filesChanged: commitData.files_changed,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in GitHub commit webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process commit webhook' },
      { status: 500 }
    );
  }
}