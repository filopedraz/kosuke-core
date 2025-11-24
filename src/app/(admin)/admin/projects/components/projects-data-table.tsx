'use client';

import {
  RowSelectionState,
  Updater,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, Trash2, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import type { ProjectStatus } from '@/lib/types/project';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { DataTablePagination } from '../../components/data-table-pagination';
import { ActiveFilterBadges, ProjectFilters } from './project-filters';
import { getProjectColumns, type AdminProject } from './projects-columns';

interface ProjectsDataTableProps {
  projects: AdminProject[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  // Filter props
  searchQuery: string;
  selectedStatuses: ProjectStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  // Sorting props
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  onSearchChange: (query: string) => void;
  onStatusesChange: (statuses: ProjectStatus[]) => void;
  onDateFromChange: (date?: Date) => void;
  onDateToChange: (date?: Date) => void;
  onClearFilters: () => void;
  onSortChange: (column: 'name' | 'createdAt') => void;
  // Pagination handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  // Action handlers
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  // Row selection props
  selectedRowIds?: string[];
  onRowSelectionChange?: (selectedRowIds: string[]) => void;
  onBulkDelete?: (selectedRowIds: string[]) => void;
  onBulkStatusChange?: (selectedRowIds: string[], status: ProjectStatus) => void;
}

export function ProjectsDataTable({
  projects,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  searchQuery,
  selectedStatuses,
  dateFrom,
  dateTo,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusesChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onView,
  onDelete,
  selectedRowIds = [],
  onRowSelectionChange,
  onBulkDelete,
  onBulkStatusChange,
}: ProjectsDataTableProps) {
  const rowSelection = useMemo(() => {
    const newRowSelection: Record<string, boolean> = {};
    selectedRowIds.forEach(id => {
      newRowSelection[id] = true;
    });
    return newRowSelection;
  }, [selectedRowIds]);

  const handleRowSelectionChange = useCallback(
    (updaterOrValue: Updater<RowSelectionState>) => {
      const newRowSelection =
        typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;

      const selectedIds = Object.keys(newRowSelection).filter(key => newRowSelection[key]);
      onRowSelectionChange?.(selectedIds);
    },
    [rowSelection, onRowSelectionChange]
  );

  const columns = useMemo(
    () => getProjectColumns({ onView, onDelete }, { sortBy, sortOrder, onSort: onSortChange }),
    [onView, onDelete, sortBy, sortOrder, onSortChange]
  );

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    enableRowSelection: true,
    getRowId: row => row.id,
    onRowSelectionChange: handleRowSelectionChange,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
      rowSelection,
    },
  });

  const activeFiltersCount =
    selectedStatuses.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;

  return (
    <>
      {/* Bulk Actions Bar */}
      {hasSelectedRows && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-md border p-3">
          <span className="text-sm font-medium">
            {selectedRows.length} row{selectedRows.length > 1 ? 's' : ''} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {onBulkStatusChange && (
              <Select
                onValueChange={value =>
                  onBulkStatusChange(
                    selectedRows.map(row => row.original.id),
                    value as ProjectStatus
                  )
                }
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requirements">Requirements</SelectItem>
                  <SelectItem value="in_development">In Development</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            )}
            {onBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onBulkDelete(selectedRows.map(row => row.original.id))}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-[400px] lg:w-[500px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by project name or description..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <ProjectFilters
          activeFiltersCount={activeFiltersCount}
          selectedStatuses={selectedStatuses}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onStatusesChange={onStatusesChange}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
        />
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X />
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filters Badges */}
      <ActiveFilterBadges
        selectedStatuses={selectedStatuses}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onStatusesChange={onStatusesChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />

      {isLoading ? (
        <TableSkeleton />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="mb-1 text-lg font-semibold">No projects found</h3>
          <p className="text-muted-foreground text-sm">
            {searchQuery || activeFiltersCount > 0
              ? 'Try adjusting your filters'
              : 'No projects available'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={e => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('[role="checkbox"]') ||
                          target.closest('[role="menuitem"]') ||
                          target.closest('button')
                        ) {
                          return;
                        }
                        onView(row.original.id);
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="py-1.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            table={table}
            totalRecords={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

