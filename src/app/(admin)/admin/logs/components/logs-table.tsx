'use client';

import { format } from 'date-fns';
import { Eye } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { CliLog } from '@/lib/types/cli-logs';

interface LogsTableProps {
  logs: CliLog[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
  onLogClick: (log: CliLog) => void;
  isLoading?: boolean;
}

export function LogsTable({
  logs,
  total,
  limit,
  offset,
  onPageChange,
  onLogClick,
  isLoading,
}: LogsTableProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="p-4 space-y-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Command</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(log.startedAt), 'MMM dd, HH:mm:ss')}
                  </TableCell>
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
                  <TableCell className="text-right font-mono text-sm">
                    ${parseFloat(log.cost).toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {(log.tokensInput + log.tokensOutput).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {(log.executionTimeMs / 1000).toFixed(1)}s
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onLogClick(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} logs
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(offset - limit)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
