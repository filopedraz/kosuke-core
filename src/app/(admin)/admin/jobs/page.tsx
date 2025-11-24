'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { QueueStatusCards } from './components/queue-status-cards';
import { ScheduledJobsTable } from './components/scheduled-jobs-table';
import { ActiveJobsList } from './components/active-jobs-list';
import { JobHistoryTable } from './components/job-history-table';
import { useQueueStatus, useScheduledJobs, useActiveJobs } from '@/hooks/use-jobs';

function JobsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Queue Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [selectedTab, setSelectedTab] = useState('overview');

  const { queues, isLoading: isLoadingQueues, refetch: refetchQueues } = useQueueStatus();
  const { scheduledJobs, refetch: refetchScheduled } = useScheduledJobs();
  const { activeJobs, refetch: refetchActive } = useActiveJobs();

  const isInitialLoad = isLoadingQueues && queues.length === 0;

  const handleRefreshAll = () => {
    refetchQueues();
    refetchScheduled();
    refetchActive();
  };

  if (isInitialLoad) {
    return <JobsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Jobs & Queues</h1>
          <p className="text-muted-foreground">
            Monitor BullMQ job queues, scheduled tasks, and background workers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Queue Status Cards */}
      <QueueStatusCards queues={queues} />

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled Jobs
            {scheduledJobs.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                {scheduledJobs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Jobs
            {activeJobs.length > 0 && (
              <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-xs">
                {activeJobs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Scheduled Jobs</h3>
              {scheduledJobs.length > 0 ? (
                <ScheduledJobsTable jobs={scheduledJobs} compact />
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  No scheduled jobs
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Active Jobs</h3>
              {activeJobs.length > 0 ? (
                <ActiveJobsList jobs={activeJobs} compact />
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  No active jobs
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledJobsTable jobs={scheduledJobs} />
        </TabsContent>

        <TabsContent value="active">
          <ActiveJobsList jobs={activeJobs} />
        </TabsContent>

        <TabsContent value="history">
          <JobHistoryTable queues={queues.map(q => q.name)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
