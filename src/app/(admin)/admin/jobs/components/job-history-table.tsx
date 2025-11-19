'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, AlertCircle, Search } from 'lucide-react';
import { useJobHistory } from '@/hooks/use-jobs';
import { JobDetailsDialog } from './job-details-dialog';
import type { JobSummary } from '@/lib/types/jobs';
import { formatDistanceToNow } from 'date-fns';

interface JobHistoryTableProps {
  queues: string[];
}

export function JobHistoryTable({ queues }: JobHistoryTableProps) {
  const [selectedQueue, setSelectedQueue] = useState(queues[0] || '');
  const [historyType, setHistoryType] = useState<'completed' | 'failed'>('completed');
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const pageSize = 50;
  const start = page * pageSize;
  const end = start + pageSize - 1;

  const { jobs, isLoading } = useJobHistory(
    selectedQueue,
    historyType,
    start,
    end,
    searchQuery || undefined
  );

  const handleViewDetails = (job: JobSummary) => {
    setSelectedJob(job);
    setDetailsDialogOpen(true);
  };

  const handleQueueChange = (value: string) => {
    setSelectedQueue(value);
    setPage(0);
  };

  const handleTypeChange = (value: string) => {
    setHistoryType(value as 'completed' | 'failed');
    setPage(0);
  };

  if (queues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        No queues available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedQueue} onValueChange={handleQueueChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select queue" />
          </SelectTrigger>
          <SelectContent>
            {queues.map(queue => (
              <SelectItem key={queue} value={queue} className="capitalize">
                {queue.replace(/-/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={historyType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="completed">Completed Jobs</SelectItem>
            <SelectItem value="failed">Failed Jobs</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or data..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Name</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Finished</TableHead>
              {historyType === 'failed' && <TableHead>Reason</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={historyType === 'failed' ? 6 : 5} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-muted-foreground">Loading jobs...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={historyType === 'failed' ? 6 : 5} className="text-center py-8">
                  <div className="text-muted-foreground">
                    <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>
                      {searchQuery
                        ? `No ${historyType} jobs found matching "${searchQuery}"`
                        : `No ${historyType} jobs found`}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map(job => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.name}</TableCell>
                  <TableCell>
                    <code className="text-xs">{job.id}</code>
                  </TableCell>
                  <TableCell>
                    {historyType === 'completed' ? (
                      <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {job.finishedOn
                      ? formatDistanceToNow(new Date(job.finishedOn), { addSuffix: true })
                      : 'N/A'}
                  </TableCell>
                  {historyType === 'failed' && (
                    <TableCell className="max-w-xs truncate text-sm text-red-600 dark:text-red-400">
                      {job.failedReason || 'Unknown error'}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(job)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} • Showing {jobs.length} jobs
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={jobs.length < pageSize || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Job Details Dialog */}
      {selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </div>
  );
}
