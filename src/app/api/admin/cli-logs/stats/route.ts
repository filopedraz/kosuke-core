import { count, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { isSuperAdminByUserId } from '@/lib/admin/permissions';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { cliLogs } from '@/lib/db/schema';
import type { CliLogStats } from '@/lib/types/cli-logs';

/**
 * GET /api/admin/cli-logs/stats
 * Get CLI logs statistics (admin only)
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

    // Total commands
    const [totalResult] = await db.select({ count: count() }).from(cliLogs);
    const totalCommands = totalResult?.count ?? 0;

    // Status counts
    const statusResults = await db
      .select({
        status: cliLogs.status,
        count: count(),
      })
      .from(cliLogs)
      .groupBy(cliLogs.status);

    const statusCounts = {
      success: 0,
      error: 0,
      cancelled: 0,
    };

    for (const result of statusResults) {
      if (result.status in statusCounts) {
        statusCounts[result.status as keyof typeof statusCounts] = result.count;
      }
    }

    // Success rate
    const successRate = totalCommands > 0 ? (statusCounts.success / totalCommands) * 100 : 0;

    // Total cost (sum all costs)
    const [costResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${cliLogs.cost} AS DECIMAL)), 0)`,
      })
      .from(cliLogs);
    const totalCost = costResult?.total ?? '0';

    // Average response time
    const [avgTimeResult] = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${cliLogs.executionTimeMs}), 0)`,
      })
      .from(cliLogs);
    const avgResponseTimeMs = Math.round(Number(avgTimeResult?.avg ?? 0));

    // Total tokens
    const [tokensResult] = await db
      .select({
        input: sql<number>`COALESCE(SUM(${cliLogs.tokensInput}), 0)`,
        output: sql<number>`COALESCE(SUM(${cliLogs.tokensOutput}), 0)`,
        cacheCreation: sql<number>`COALESCE(SUM(${cliLogs.tokensCacheCreation}), 0)`,
        cacheRead: sql<number>`COALESCE(SUM(${cliLogs.tokensCacheRead}), 0)`,
      })
      .from(cliLogs);

    const totalTokens =
      Number(tokensResult?.input ?? 0) +
      Number(tokensResult?.output ?? 0) +
      Number(tokensResult?.cacheCreation ?? 0);

    const totalCacheableTokens =
      Number(tokensResult?.cacheCreation ?? 0) + Number(tokensResult?.cacheRead ?? 0);
    const cacheHitRate =
      totalCacheableTokens > 0
        ? (Number(tokensResult?.cacheRead ?? 0) / totalCacheableTokens) * 100
        : 0;

    // Command counts
    const commandResults = await db
      .select({
        command: cliLogs.command,
        count: count(),
      })
      .from(cliLogs)
      .groupBy(cliLogs.command);

    const commandCounts: Record<string, number> = {
      ship: 0,
      test: 0,
      review: 0,
      getcode: 0,
      tickets: 0,
    };

    for (const result of commandResults) {
      if (result.command in commandCounts) {
        commandCounts[result.command] = result.count;
      }
    }

    const stats: CliLogStats = {
      totalCommands,
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
      totalCost,
      avgResponseTimeMs,
      totalTokens,
      cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      statusCounts,
      commandCounts: commandCounts as Record<
        'ship' | 'test' | 'review' | 'getcode' | 'tickets',
        number
      >,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API /admin/cli-logs/stats] Error fetching stats:', error);
    return ApiErrorHandler.handle(error);
  }
}
