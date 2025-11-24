import { requireSuperAdmin } from '@/lib/admin/permissions';
import { getCompletedJobs, getFailedJobs, getWaitingJobs, getDelayedJobs } from '@/lib/queue/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/jobs/history
 * Get job history with pagination and search
 * Query params: queueName, type (completed/failed/waiting/delayed), start, end, search
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const searchParams = request.nextUrl.searchParams;
    const queueName = searchParams.get('queueName');
    const type = searchParams.get('type') as 'completed' | 'failed' | 'waiting' | 'delayed' | null;
    const start = parseInt(searchParams.get('start') || '0', 10);
    const end = parseInt(searchParams.get('end') || '49', 10);
    const search = searchParams.get('search') || undefined;

    if (!queueName) {
      return NextResponse.json({ error: 'queueName is required' }, { status: 400 });
    }

    if (!type || !['completed', 'failed', 'waiting', 'delayed'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    let jobs;
    switch (type) {
      case 'completed':
        jobs = await getCompletedJobs(queueName, start, end, search);
        break;
      case 'failed':
        jobs = await getFailedJobs(queueName, start, end, search);
        break;
      case 'waiting':
        jobs = await getWaitingJobs(queueName, search);
        break;
      case 'delayed':
        jobs = await getDelayedJobs(queueName, search);
        break;
    }

    return NextResponse.json({
      success: true,
      data: { jobs },
    });
  } catch (error) {
    console.error('Error fetching job history:', error);

    if (error instanceof Error && error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch job history' }, { status: 500 });
  }
}
