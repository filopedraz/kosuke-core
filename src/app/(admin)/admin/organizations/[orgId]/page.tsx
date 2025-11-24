'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Users, Database, MessageSquare, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { use } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ClerkOrganization, OrganizationDetailMetrics } from '@/lib/types';

interface CliLog {
  id: string;
  command: string;
  status: string;
  tokensInput: number;
  tokensOutput: number;
  cost: string;
  startedAt: string;
}

interface OrganizationDetailResponse {
  organization: ClerkOrganization;
  members: unknown[];
  projects: unknown[];
  metrics: OrganizationDetailMetrics;
  logs: CliLog[];
}

const costTrendConfig = {
  cost: {
    label: 'Cost ($)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const tokensByCommandConfig = {
  totalTokens: {
    label: 'Tokens',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export default function OrganizationDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);

  const { data, isLoading } = useQuery<OrganizationDetailResponse>({
    queryKey: ['admin-organization-detail', orgId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/organizations/${orgId}`);
      if (!response.ok) throw new Error('Failed to fetch organization details');
      const result = await response.json();
      return result.data;
    },
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  const { organization, members, projects, metrics, logs } = data;

  // Prepare chart data
  const costTrendData = metrics.costTrend
    .slice()
    .reverse()
    .map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cost: item.cost,
      tokens: item.tokens,
    }));

  const tokensByCommandData = metrics.tokensByCommand.map(item => ({
    command: item.command,
    totalTokens: item.totalTokens,
    count: item.count,
  }));

  const totalTokens =
    metrics.tokensByCommand.reduce((sum, item) => sum + item.totalTokens, 0) +
    metrics.chatMetrics.totalTokensFromChat;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/organizations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Link>
        </Button>
      </div>

      {/* Organization Info */}
      <div className="flex items-center gap-4">
        {organization.imageUrl ? (
          <Image
            src={organization.imageUrl}
            alt={organization.name}
            width={64}
            height={64}
            className="rounded-lg"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {organization.slug && <p className="text-muted-foreground">@{organization.slug}</p>}
            <Badge variant={organization.isPersonal ? 'secondary' : 'default'}>
              {organization.isPersonal ? 'Personal' : 'Team'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.chatMetrics.totalSessions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.chatMetrics.totalMessages.toLocaleString()} messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.chatMetrics.totalTokensFromChat.toLocaleString()} from chat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Trend (Last 30 Days)</CardTitle>
            <CardDescription>Daily LLM cost breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {costTrendData.length > 0 ? (
              <ChartContainer config={costTrendConfig}>
                <LineChart data={costTrendData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Line
                    dataKey="cost"
                    type="monotone"
                    stroke="var(--color-cost)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No cost data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tokens by Command */}
        <Card>
          <CardHeader>
            <CardTitle>Tokens by Command Type</CardTitle>
            <CardDescription>LLM token usage breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {tokensByCommandData.length > 0 ? (
              <ChartContainer config={tokensByCommandConfig}>
                <BarChart data={tokensByCommandData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="command" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="totalTokens" fill="var(--color-totalTokens)" radius={8} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No token data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent LLM Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent LLM Logs</CardTitle>
          <CardDescription>Last 50 LLM executions</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Command</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Started At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 10).map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{log.command}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === 'success'
                              ? 'default'
                              : log.status === 'error'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {(log.tokensInput + log.tokensOutput).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        ${parseFloat(log.cost).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No LLM logs available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
