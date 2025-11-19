import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { cliLogs } from '@/lib/db/schema';

/**
 * Cost alert thresholds
 * Can be configured per project or use defaults
 */
// TODO: Uncomment when needed
// export interface CostThresholds {
//   daily?: number; // USD
//   weekly?: number; // USD
//   monthly?: number; // USD
// }

interface CostThresholds {
  daily?: number; // USD
  weekly?: number; // USD
  monthly?: number; // USD
}

const DEFAULT_THRESHOLDS: CostThresholds = {
  daily: 10.0, // $10/day
  weekly: 50.0, // $50/week
  monthly: 150.0, // $150/month
};

/**
 * Check if a project has exceeded cost thresholds
 * Returns alerts for any exceeded thresholds
 */
export async function checkCostAlerts(
  projectId: string,
  thresholds: CostThresholds = DEFAULT_THRESHOLDS
): Promise<{
  exceeded: boolean;
  alerts: Array<{
    period: 'daily' | 'weekly' | 'monthly';
    threshold: number;
    actual: number;
    percentage: number;
  }>;
}> {
  const now = new Date();
  const alerts: Array<{
    period: 'daily' | 'weekly' | 'monthly';
    threshold: number;
    actual: number;
    percentage: number;
  }> = [];

  // Check daily threshold
  if (thresholds.daily) {
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dailyCost = await getCostSince(projectId, oneDayAgo);

    if (dailyCost >= thresholds.daily) {
      alerts.push({
        period: 'daily',
        threshold: thresholds.daily,
        actual: dailyCost,
        percentage: (dailyCost / thresholds.daily) * 100,
      });
    }
  }

  // Check weekly threshold
  if (thresholds.weekly) {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyCost = await getCostSince(projectId, oneWeekAgo);

    if (weeklyCost >= thresholds.weekly) {
      alerts.push({
        period: 'weekly',
        threshold: thresholds.weekly,
        actual: weeklyCost,
        percentage: (weeklyCost / thresholds.weekly) * 100,
      });
    }
  }

  // Check monthly threshold
  if (thresholds.monthly) {
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthlyCost = await getCostSince(projectId, oneMonthAgo);

    if (monthlyCost >= thresholds.monthly) {
      alerts.push({
        period: 'monthly',
        threshold: thresholds.monthly,
        actual: monthlyCost,
        percentage: (monthlyCost / thresholds.monthly) * 100,
      });
    }
  }

  return {
    exceeded: alerts.length > 0,
    alerts,
  };
}

/**
 * Get total cost for a project since a given date
 */
async function getCostSince(projectId: string, since: Date): Promise<number> {
  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${cliLogs.cost} AS DECIMAL)), 0)`,
    })
    .from(cliLogs)
    .where(sql`${cliLogs.projectId} = ${projectId} AND ${cliLogs.startedAt} >= ${since}`);

  return parseFloat(result?.total ?? '0');
}

/**
 * Get projects that have exceeded their cost thresholds
 * Useful for batch checking/alerting
 */
// TODO: Uncomment when needed (also add back 'eq' and 'projects' to imports)
// export async function getProjectsExceedingThresholds(
//   thresholds: CostThresholds = DEFAULT_THRESHOLDS
// ): Promise<
//   Array<{
//     projectId: string;
//     projectName: string;
//     alerts: Array<{
//       period: 'daily' | 'weekly' | 'monthly';
//       threshold: number;
//       actual: number;
//       percentage: number;
//     }>;
//   }>
// > {
//   // Get all active projects
//   const activeProjects = await db
//     .select({
//       id: projects.id,
//       name: projects.name,
//     })
//     .from(projects)
//     .where(eq(projects.isArchived, false));

//   const results = [];

//   for (const project of activeProjects) {
//     const { exceeded, alerts } = await checkCostAlerts(project.id, thresholds);

//     if (exceeded) {
//       results.push({
//         projectId: project.id,
//         projectName: project.name,
//         alerts,
//       });
//     }
//   }

//   return results;
// }

/**
 * Format cost alert message for notifications
 */
export function formatCostAlert(alert: {
  period: 'daily' | 'weekly' | 'monthly';
  threshold: number;
  actual: number;
  percentage: number;
  projectName?: string;
}): string {
  const periodLabel = {
    daily: 'today',
    weekly: 'this week',
    monthly: 'this month',
  }[alert.period];

  return `⚠️ Cost Alert${alert.projectName ? ` for ${alert.projectName}` : ''}: $${alert.actual.toFixed(2)} spent ${periodLabel} (${alert.percentage.toFixed(0)}% of $${alert.threshold} limit)`;
}
