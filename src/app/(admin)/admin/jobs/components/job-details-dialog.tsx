'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { JobSummary } from '@/lib/types/jobs';
import { format } from 'date-fns';

interface JobDetailsDialogProps {
  job: JobSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobDetailsDialog({ job, open, onOpenChange }: JobDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Job Name</p>
              <p className="font-medium">{job.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Job ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">{job.id}</code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Queue</p>
              <Badge variant="outline" className="capitalize">
                {job.queueName.replace(/-/g, ' ')}
              </Badge>
            </div>
            {job.attemptsMade !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Attempts</p>
                <p className="font-medium">{job.attemptsMade}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            {job.timestamp && (
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="text-sm">{format(new Date(job.timestamp), 'PPpp')}</p>
              </div>
            )}
            {job.processedOn && (
              <div>
                <p className="text-sm text-muted-foreground">Processed On</p>
                <p className="text-sm">{format(new Date(job.processedOn), 'PPpp')}</p>
              </div>
            )}
            {job.finishedOn && (
              <div>
                <p className="text-sm text-muted-foreground">Finished On</p>
                <p className="text-sm">{format(new Date(job.finishedOn), 'PPpp')}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Job Data */}
          {job.data && Object.keys(job.data).length > 0 && (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Job Data</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                  {JSON.stringify(job.data, null, 2)}
                </pre>
              </div>
              <Separator />
            </>
          )}

          {/* Return Value */}
          {job.returnvalue !== undefined && job.returnvalue !== null && (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Return Value</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                  {JSON.stringify(job.returnvalue, null, 2)}
                </pre>
              </div>
              <Separator />
            </>
          )}

          {/* Error Info */}
          {job.failedReason && (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Error Message</p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded">
                  <p className="text-sm text-red-800 dark:text-red-200">{job.failedReason}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Stack Trace */}
          {job.stacktrace && job.stacktrace.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Stack Trace</p>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                {job.stacktrace.join('\n')}
              </pre>
            </div>
          )}

          {/* Progress */}
          {job.progress !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Progress</p>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {typeof job.progress === 'object'
                  ? JSON.stringify(job.progress, null, 2)
                  : `${job.progress}%`}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
