'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Activity } from 'lucide-react';
import type { JobSummary } from '@/lib/types/jobs';
import { formatDistanceToNow } from 'date-fns';

interface ActiveJobsListProps {
  jobs: JobSummary[];
  compact?: boolean;
}

export function ActiveJobsList({ jobs, compact = false }: ActiveJobsListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        <Activity className="mx-auto h-12 w-12 mb-2 opacity-50" />
        <p>No active jobs running</p>
      </div>
    );
  }

  const displayJobs = compact ? jobs.slice(0, 5) : jobs;

  return (
    <div className="space-y-3">
      {displayJobs.map(job => {
        const progressValue = typeof job.progress === 'number' ? job.progress : undefined;

        return (
          <Card key={job.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-medium">{job.name}</span>
                    <Badge variant="outline" className="capitalize">
                      {job.queueName.replace(/-/g, ' ')}
                    </Badge>
                  </div>
                  {job.timestamp && (
                    <p className="text-sm text-muted-foreground">
                      Started {formatDistanceToNow(new Date(job.timestamp), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900">
                  Running
                </Badge>
              </div>

              {progressValue !== undefined && (
                <div className="space-y-1 mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progressValue}%</span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>
              )}

              {job.data && Object.keys(job.data).length > 0 && !compact && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Job Data:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                    {JSON.stringify(job.data, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {compact && jobs.length > 5 && (
        <p className="text-sm text-muted-foreground text-center">
          +{jobs.length - 5} more active jobs
        </p>
      )}
    </div>
  );
}
