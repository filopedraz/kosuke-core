import { count, desc, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { isSuperAdminByUserId } from '@/lib/admin/permissions';
import { auth } from '@/lib/auth';
import { clerkService } from '@/lib/clerk';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, cliLogs, projects } from '@/lib/db/schema';
import type { OrganizationDetailMetrics } from '@/lib/types';

/**
 * GET /api/admin/organizations/[orgId]
 * Get organization details with metrics (admin only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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

    const { orgId } = await params;

    // Get organization from Clerk
    const organization = await clerkService.getOrganization(orgId);

    // Get members
    const members = await clerkService.getOrganizationMembers(orgId);

    // Get projects
    const orgProjects = await db.select().from(projects).where(eq(projects.orgId, orgId));

    // Get token breakdown by command
    const tokensByCommand = await db
      .select({
        command: cliLogs.command,
        tokensInput: sql<number>`COALESCE(SUM(${cliLogs.tokensInput}), 0)`,
        tokensOutput: sql<number>`COALESCE(SUM(${cliLogs.tokensOutput}), 0)`,
        count: count(),
      })
      .from(cliLogs)
      .where(eq(cliLogs.orgId, orgId))
      .groupBy(cliLogs.command);

    // Get cost trend over time (last 30 days, grouped by day)
    const costTrend = await db
      .select({
        date: sql<string>`DATE(${cliLogs.startedAt})`,
        cost: sql<number>`COALESCE(SUM(CAST(${cliLogs.cost} AS DECIMAL)), 0)`,
        tokens: sql<number>`COALESCE(SUM(${cliLogs.tokensInput} + ${cliLogs.tokensOutput}), 0)`,
      })
      .from(cliLogs)
      .where(eq(cliLogs.orgId, orgId))
      .groupBy(sql`DATE(${cliLogs.startedAt})`)
      .orderBy(sql`DATE(${cliLogs.startedAt}) DESC`)
      .limit(30);

    // Get chat metrics (for projects in this org)
    const projectIds = orgProjects.map(p => p.id);

    let chatMetrics = {
      totalSessions: 0,
      totalMessages: 0,
      totalTokensFromChat: 0,
    };

    if (projectIds.length > 0) {
      const [sessionsResult] = await db
        .select({ count: count() })
        .from(chatSessions)
        .where(sql`${chatSessions.projectId} = ANY(${projectIds})`);

      const [messagesResult] = await db
        .select({
          count: count(),
          totalTokens: sql<number>`COALESCE(SUM(${chatMessages.tokensInput} + ${chatMessages.tokensOutput}), 0)`,
        })
        .from(chatMessages)
        .where(sql`${chatMessages.projectId} = ANY(${projectIds})`);

      chatMetrics = {
        totalSessions: sessionsResult?.count || 0,
        totalMessages: messagesResult?.count || 0,
        totalTokensFromChat: Number(messagesResult?.totalTokens || 0),
      };
    }

    // Get LLM logs for this organization (paginated)
    const logs = await db
      .select()
      .from(cliLogs)
      .where(eq(cliLogs.orgId, orgId))
      .orderBy(desc(cliLogs.startedAt))
      .limit(50);

    const metrics: OrganizationDetailMetrics = {
      tokensByCommand: tokensByCommand.map(row => ({
        command: row.command,
        tokensInput: Number(row.tokensInput),
        tokensOutput: Number(row.tokensOutput),
        totalTokens: Number(row.tokensInput) + Number(row.tokensOutput),
        count: row.count,
      })),
      costTrend: costTrend.map(row => ({
        date: row.date,
        cost: Number(row.cost),
        tokens: Number(row.tokens),
      })),
      chatMetrics,
    };

    return NextResponse.json({
      data: {
        organization,
        members: members.data,
        projects: orgProjects,
        metrics,
        logs,
      },
    });
  } catch (error) {
    console.error('[API /admin/organizations/[orgId]] Error fetching organization:', error);
    return ApiErrorHandler.handle(error);
  }
}
