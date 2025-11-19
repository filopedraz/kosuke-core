'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CliLogCommand, CliLogStatus } from '@/lib/types/cli-logs';

interface LogsFiltersProps {
  selectedCommand?: CliLogCommand;
  selectedStatus?: CliLogStatus;
  onCommandChange: (command?: CliLogCommand) => void;
  onStatusChange: (status?: CliLogStatus) => void;
  onRefresh: () => void;
}

export function LogsFilters({
  selectedCommand,
  selectedStatus,
  onCommandChange,
  onStatusChange,
  onRefresh,
}: LogsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      {/* Command Filter */}
      <Select
        value={selectedCommand || 'all'}
        onValueChange={value =>
          onCommandChange(value === 'all' ? undefined : (value as CliLogCommand))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Commands" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Commands</SelectItem>
          <SelectItem value="ship">Ship</SelectItem>
          <SelectItem value="test">Test</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="getcode">Get Code</SelectItem>
          <SelectItem value="tickets">Tickets</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={selectedStatus || 'all'}
        onValueChange={value =>
          onStatusChange(value === 'all' ? undefined : (value as CliLogStatus))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="success">Success</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {/* Refresh Button */}
      <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}
