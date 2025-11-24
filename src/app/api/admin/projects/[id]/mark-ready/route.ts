import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, getSuperAdminUser } from '@/lib/admin/permissions';
import { db } from '@/lib/db/drizzle';
import { projects, projectAuditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendProjectReadyEmail } from '@/lib/email/send-project-ready';

/**
 * POST /api/admin/projects/[id]/mark-ready
 * Mark a project as ready and send notifications (super admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check super admin access
    await requireSuperAdmin();

    const adminUser = await getSuperAdminUser();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: projectId } = await params;

    // Get project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is in in_development status
    if (project.status !== 'in_development') {
      return NextResponse.json(
        { error: 'Project must be in development status to mark as ready' },
        { status: 400 }
      );
    }

    // Update project status to active
    await db
      .update(projects)
      .set({
        status: 'active',
        requirementsCompletedAt: new Date(),
        requirementsCompletedBy: adminUser.email,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // Create audit log
    await db.insert(projectAuditLogs).values({
      projectId,
      userId: adminUser.userId,
      action: 'marked_ready',
      previousValue: 'in_development',
      newValue: 'active',
      metadata: {
        markedReadyAt: new Date().toISOString(),
        markedReadyBy: adminUser.email,
      },
    });

    // Send email notifications to all organization members
    try {
      await sendProjectReadyEmail({
        projectId: project.id,
        projectName: project.name,
        orgId: project.orgId || '',
      });
    } catch (emailError) {
      console.error('Failed to send project ready emails:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Project marked as ready and notifications sent',
      },
    });
  } catch (error) {
    console.error('Error marking project as ready:', error);

    if (error instanceof Error && error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to mark project as ready' },
      { status: 500 }
    );
  }
}

