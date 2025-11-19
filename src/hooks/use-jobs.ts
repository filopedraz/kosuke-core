/**
 * Jobs Management Hooks
 *
 * Custom TanStack Query hooks for queue and job management.
 * MVP: Read-only monitoring with auto-refresh
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { QueueMetrics, RepeatableJob, JobSummary } from '@/lib/types/jobs';

interface QueueStatusResponse {
  success: boolean;
  data: {
    queues: QueueMetrics[];
  };
}

interface ScheduledJobsResponse {
  success: boolean;
  data: {
    jobs: RepeatableJob[];
  };
}

interface ActiveJobsResponse {
  success: boolean;
  data: {
    jobs: JobSummary[];
  };
}

interface JobHistoryResponse {
  success: boolean;
  data: {
    jobs: JobSummary[];
  };
}

/**
 * Hook to get queue status and metrics
 * Auto-refreshes every 5 seconds
 */
export function useQueueStatus() {
  const { data, isLoading, error, refetch } = useQuery<QueueStatusResponse>({
    queryKey: ['admin-jobs-queues'],
    queryFn: async () => {
      const response = await fetch('/api/admin/jobs/queues');
      if (!response.ok) {
        throw new Error('Failed to fetch queue status');
      }
      return response.json();
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 4000,
  });

  return {
    queues: data?.data?.queues ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get all scheduled (repeatable) jobs
 * Auto-refreshes every 10 seconds
 */
export function useScheduledJobs() {
  const { data, isLoading, error, refetch } = useQuery<ScheduledJobsResponse>({
    queryKey: ['admin-jobs-scheduled'],
    queryFn: async () => {
      const response = await fetch('/api/admin/jobs/scheduled');
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled jobs');
      }
      return response.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    staleTime: 8000,
  });

  return {
    scheduledJobs: data?.data?.jobs ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get all active (running) jobs
 * Auto-refreshes every 3 seconds for real-time feel
 */
export function useActiveJobs() {
  const { data, isLoading, error, refetch } = useQuery<ActiveJobsResponse>({
    queryKey: ['admin-jobs-active'],
    queryFn: async () => {
      const response = await fetch('/api/admin/jobs/active');
      if (!response.ok) {
        throw new Error('Failed to fetch active jobs');
      }
      return response.json();
    },
    refetchInterval: 3000, // Auto-refresh every 3 seconds
    staleTime: 2000,
  });

  return {
    activeJobs: data?.data?.jobs ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get job history with pagination and search
 */
export function useJobHistory(
  queueName: string,
  type: 'completed' | 'failed' | 'waiting' | 'delayed',
  start = 0,
  end = 49,
  search?: string
) {
  const { data, isLoading, error, refetch } = useQuery<JobHistoryResponse>({
    queryKey: ['admin-jobs-history', queueName, type, start, end, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        queueName,
        type,
        start: start.toString(),
        end: end.toString(),
      });

      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/admin/jobs/history?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job history');
      }
      return response.json();
    },
    refetchInterval: type === 'waiting' || type === 'delayed' ? 5000 : undefined,
    staleTime: type === 'waiting' || type === 'delayed' ? 4000 : 30000,
    enabled: !!queueName,
  });

  return {
    jobs: data?.data?.jobs ?? [],
    isLoading,
    error,
    refetch,
  };
}
