import { count, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { isSuperAdminByUserId } from '@/lib/admin/permissions';
import { auth } from '@/lib/auth';
import { clerkService } from '@/lib/clerk';
import { db } from '@/lib/db/drizzle';
import { cliLogs, projects } from '@/lib/db/schema';

/**
 * GET /api/admin/organizations/stats
 * Get global organization statistics (admin only)
 */
export async function GET(_request: NextRequest) {
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

    // Get total organizations count from Clerk
    const { totalCount: totalOrganizations } = await clerkService.listOrganizations({
      limit: 1,
      offset: 0,
    });

    // Get total tokens and cost from LLM logs
    const [logsStats] = await db
      .select({
        totalLogs: count(),
        totalTokensInput: sql<number>`COALESCE(SUM(${cliLogs.tokensInput}), 0)`,
        totalTokensOutput: sql<number>`COALESCE(SUM(${cliLogs.tokensOutput}), 0)`,
        totalCost: sql<string>`COALESCE(SUM(CAST(${cliLogs.cost} AS DECIMAL)), 0)`,
      })
      .from(cliLogs);

    // Get total active projects
    const [projectsStats] = await db
      .select({
        totalProjects: count(),
      })
      .from(projects)
      .where(eq(projects.isArchived, false));

    const totalTokensUsed =
      Number(logsStats?.totalTokensInput || 0) + Number(logsStats?.totalTokensOutput || 0);

    return NextResponse.json({
      data: {
        totalOrganizations,
        totalTokensUsed,
        totalCost: logsStats?.totalCost || '0',
        totalActiveProjects: projectsStats?.totalProjects || 0,
        totalLogs: logsStats?.totalLogs || 0,
      },
    });
  } catch (error) {
    console.error('[API /admin/organizations/stats] Error fetching stats:', error);
    return ApiErrorHandler.handle(error);
  }
}
