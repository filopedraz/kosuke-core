import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { isSuperAdminByUserId } from '@/lib/admin/permissions';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { cliLogs } from '@/lib/db/schema';

/**
 * GET /api/admin/cli-logs
 * Get all CLI logs with filters (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    // Check super admin access
    const isAdmin = await isSuperAdminByUserId(userId);
    if (!isAdmin) {
      return ApiErrorHandler.forbidden();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const command = searchParams.get('command');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Build where conditions
    const conditions = [];
    if (projectId) conditions.push(eq(cliLogs.projectId, projectId));
    if (command)
      conditions.push(
        eq(cliLogs.command, command as 'ship' | 'test' | 'review' | 'getcode' | 'tickets')
      );
    if (status) conditions.push(eq(cliLogs.status, status as 'success' | 'error' | 'cancelled'));
    if (startDate) conditions.push(gte(cliLogs.startedAt, new Date(startDate)));
    if (endDate) conditions.push(lte(cliLogs.startedAt, new Date(endDate)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get logs
    const logs = await db
      .select()
      .from(cliLogs)
      .where(whereClause)
      .orderBy(desc(cliLogs.startedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(cliLogs).where(whereClause);

    return NextResponse.json({
      logs,
      total: totalResult?.count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API /admin/cli-logs] Error fetching logs:', error);
    return ApiErrorHandler.handle(error);
  }
}
