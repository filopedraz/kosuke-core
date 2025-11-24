import { requireSuperAdmin } from '@/lib/admin/permissions';
import { getAllRepeatableJobs } from '@/lib/queue/admin';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/jobs/scheduled
 * Get all scheduled (repeatable/cron) jobs
 */
export async function GET() {
  try {
    await requireSuperAdmin();

    const jobs = await getAllRepeatableJobs();

    return NextResponse.json({
      success: true,
      data: { jobs },
    });
  } catch (error) {
    console.error('Error fetching scheduled jobs:', error);

    if (error instanceof Error && error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch scheduled jobs' }, { status: 500 });
  }
}
