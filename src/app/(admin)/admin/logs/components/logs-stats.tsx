'use client';

import { Activity, Check, Clock, DollarSign } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CliLogStats } from '@/lib/types/cli-logs';

interface LogsStatsProps {
  stats: CliLogStats;
}

export function LogsStats({ stats }: LogsStatsProps) {
  return (
    <>
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commands</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCommands.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All CLI executions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.statusCounts.success} success • {stats.statusCounts.error} errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${parseFloat(stats.totalCost).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {(stats.totalTokens / 1_000_000).toFixed(2)}M tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.avgResponseTimeMs / 1000).toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">
              Cache hit: {stats.cacheHitRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Command Breakdown */}
      {Object.keys(stats.commandCounts).some(
        cmd => stats.commandCounts[cmd as keyof typeof stats.commandCounts] > 0
      ) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Commands by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.commandCounts).map(
                ([command, count]) =>
                  count > 0 && (
                    <Badge key={command} variant="secondary" className="text-sm">
                      <span className="font-semibold">{count}</span>
                      <span className="ml-1 text-muted-foreground">{command}</span>
                    </Badge>
                  )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
