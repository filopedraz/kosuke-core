'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { RepeatableJob } from '@/lib/types/jobs';
import { formatDistanceToNow } from 'date-fns';

interface ScheduledJobsTableProps {
  jobs: RepeatableJob[];
  compact?: boolean;
}

export function ScheduledJobsTable({ jobs, compact = false }: ScheduledJobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        <Clock className="mx-auto h-12 w-12 mb-2 opacity-50" />
        <p>No scheduled jobs found</p>
      </div>
    );
  }

  const displayJobs = compact ? jobs.slice(0, 5) : jobs;

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Name</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Next Run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayJobs.map(job => (
              <TableRow key={job.key}>
                <TableCell className="font-medium">{job.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {job.queueName.replace(/-/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{job.pattern}</code>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {job.next ? formatDistanceToNow(new Date(job.next), { addSuffix: true }) : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {compact && jobs.length > 5 && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          +{jobs.length - 5} more scheduled jobs
        </p>
      )}
    </>
  );
}
