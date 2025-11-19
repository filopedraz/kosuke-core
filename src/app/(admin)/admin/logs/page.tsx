'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Skeleton } from '@/components/ui/skeleton';
import type { CliLog, CliLogCommand, CliLogStatus } from '@/lib/types/cli-logs';

import { LogsStats } from './components/logs-stats';
import { LogsFilters } from './components/logs-filters';
import { LogsTable } from './components/logs-table';
import { LogDetailSheet } from './components/log-detail-sheet';

interface CliLogsResponse {
  logs: CliLog[];
  total: number;
  limit: number;
  offset: number;
}

export default function AdminLogsPage() {
  const [selectedCommand, setSelectedCommand] = useState<CliLogCommand | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<CliLogStatus | undefined>();
  const [selectedLog, setSelectedLog] = useState<CliLog | null>(null);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Fetch statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-cli-logs-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cli-logs/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch logs
  const { data, isLoading: isLoadingLogs } = useQuery<CliLogsResponse>({
    queryKey: ['admin-cli-logs', selectedCommand, selectedStatus, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (selectedCommand) params.append('command', selectedCommand);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await fetch(`/api/admin/cli-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const isLoading = isLoadingStats || isLoadingLogs;
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  const handleRefresh = () => {
    window.location.reload();
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
  };

  if (isLoading && !stats) {
    return <LogsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CLI Logs</h1>
        <p className="text-muted-foreground mt-2">
          Monitor all kosuke-cli command executions and performance metrics
        </p>
      </div>

      {/* Statistics */}
      {stats && <LogsStats stats={stats} />}

      {/* Filters */}
      <LogsFilters
        selectedCommand={selectedCommand}
        selectedStatus={selectedStatus}
        onCommandChange={setSelectedCommand}
        onStatusChange={setSelectedStatus}
        onRefresh={handleRefresh}
      />

      {/* Logs Table */}
      <LogsTable
        logs={logs}
        total={total}
        limit={limit}
        offset={offset}
        onPageChange={handlePageChange}
        onLogClick={setSelectedLog}
        isLoading={isLoadingLogs}
      />

      {/* Log Detail Sheet */}
      <LogDetailSheet
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={open => !open && setSelectedLog(null)}
      />
    </div>
  );
}

function LogsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-20 ml-auto" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border">
        <div className="p-4 space-y-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
