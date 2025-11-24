import { requireSuperAdmin } from '@/lib/admin/permissions';
import { getAllActiveJobs } from '@/lib/queue/admin';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/jobs/active
 * Get all currently running jobs
 */
export async function GET() {
  try {
    await requireSuperAdmin();

    const jobs = await getAllActiveJobs();

    return NextResponse.json({
      success: true,
      data: { jobs },
    });
  } catch (error) {
    console.error('Error fetching active jobs:', error);

    if (error instanceof Error && error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch active jobs' }, { status: 500 });
  }
}
