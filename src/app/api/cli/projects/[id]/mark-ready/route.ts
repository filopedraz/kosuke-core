import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, projectAuditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendProjectReadyEmail } from '@/lib/email/send-project-ready';

/**
 * POST /api/cli/projects/[id]/mark-ready
 * Mark a project as ready (transition from in_development to active)
 * Used by kosuke-cli and other external services
 * Requires API key authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify API key from CLI
    const apiKey = request.headers.get('x-cli-api-key');
    const expectedKey = process.env.KOSUKE_CLI_API_KEY;

    if (!expectedKey) {
      console.error('[API /cli/projects/mark-ready] KOSUKE_CLI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!apiKey || apiKey !== expectedKey) {
      console.warn('[API /cli/projects/mark-ready] Invalid API key attempt');
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 403 }
      );
    }

    const { id: projectId } = await params;

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if project is in in_development status (strict validation)
    if (project.status !== 'in_development') {
      return NextResponse.json(
        {
          error: 'Project must be in development status to mark as ready',
          currentStatus: project.status,
        },
        { status: 400 }
      );
    }

    // Update project status to active
    await db
      .update(projects)
      .set({
        status: 'active',
        requirementsCompletedAt: new Date(),
        requirementsCompletedBy: 'kosuke-cli',
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // Create audit log
    await db.insert(projectAuditLogs).values({
      projectId,
      userId: 'system', // CLI operations are system-initiated
      action: 'marked_ready',
      previousValue: 'in_development',
      newValue: 'active',
      metadata: {
        markedReadyAt: new Date().toISOString(),
        markedReadyBy: 'kosuke-cli',
        source: 'cli',
      },
    });

    // Send email notifications to all organization members
    try {
      await sendProjectReadyEmail({
        projectId: project.id,
        projectName: project.name,
        orgId: project.orgId || '',
      });
      console.log(`[API /cli/projects/mark-ready] ✅ Email notifications sent for project ${projectId}`);
    } catch (emailError) {
      console.error('[API /cli/projects/mark-ready] Failed to send emails:', emailError);
      // Don't fail the request if email fails
    }

    console.log(`[API /cli/projects/mark-ready] ✅ Project ${projectId} marked as ready`);

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        status: 'active',
        message: 'Project marked as ready and notifications sent',
      },
    });
  } catch (error) {
    console.error('[API /cli/projects/mark-ready] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to mark project as ready',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

