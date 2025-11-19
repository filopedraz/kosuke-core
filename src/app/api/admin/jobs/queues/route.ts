import { requireSuperAdmin } from '@/lib/admin/permissions';
import { getAllQueueMetrics } from '@/lib/queue/admin';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/jobs/queues
 * Get status and metrics for all queues
 */
export async function GET() {
  try {
    await requireSuperAdmin();

    const queues = await getAllQueueMetrics();

    return NextResponse.json({
      success: true,
      data: { queues },
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);

    if (error instanceof Error && error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
  }
}
