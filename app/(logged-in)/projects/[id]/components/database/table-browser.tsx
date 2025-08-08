'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDatabaseSchema } from '@/hooks/use-database-schema';
import { useTableData } from '@/hooks/use-table-data';
import type { TableBrowserProps } from '@/lib/types';
import { ChevronLeft, ChevronRight, Table, Database } from 'lucide-react';
import { useState } from 'react';
import { TableBrowserSkeleton } from './skeletons/table-browser-skeleton';
import { cn } from '@/lib/utils';

export function TableBrowser({ projectId, sessionId }: TableBrowserProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 100;

  const { data: schema, isLoading: schemaLoading } = useDatabaseSchema(projectId, sessionId);
  const { data: tableData, isLoading: dataLoading, error } = useTableData(
    projectId,
    selectedTable,
    sessionId,
    pageSize,
    currentPage * pageSize
  );

  if (schemaLoading) {
    return <TableBrowserSkeleton />;
  }

  const tables = schema?.tables || [];

  return (
    <div className="flex h-full max-h-[600px] border rounded-lg overflow-hidden bg-background">
      {/* Left Sidebar - Tables List */}
      <div className="w-64 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Database className="w-4 h-4" />
            Tables ({tables.length})
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {tables.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No tables found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {tables.map(table => (
                <button
                  key={table.name}
                  onClick={() => {
                    setSelectedTable(table.name);
                    setCurrentPage(0);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-md hover:bg-muted/50 transition-colors group",
                    selectedTable === table.name && "bg-muted border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{table.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {table.row_count.toLocaleString()} rows
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedTable ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTable}</h3>
                  {tableData && (
                    <p className="text-sm text-muted-foreground">
                      {tableData.total_rows.toLocaleString()} total rows
                    </p>
                  )}
                </div>
                {tableData && (
                  <Badge variant="secondary" className="text-xs">
                    {tableData.returned_rows} of {tableData.total_rows}
                  </Badge>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-hidden">
              {dataLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading table data...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-destructive">
                    <p className="font-medium">Error loading table data</p>
                    <p className="text-sm">{error.message}</p>
                  </div>
                </div>
              ) : tableData && tableData.data.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Table */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr>
                          {Object.keys(tableData.data[0]).map(column => (
                            <th key={column} className="p-3 text-left font-medium bg-muted/20 border-r last:border-r-0">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.data.map((row, index) => (
                          <tr key={index} className="border-b hover:bg-muted/20">
                            {Object.values(row).map((value, colIndex) => (
                              <td key={colIndex} className="p-3 font-mono border-r last:border-r-0">
                                {value === null ? (
                                  <span className="text-muted-foreground italic text-xs">NULL</span>
                                ) : (
                                  <span className="text-xs">{String(value)}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Showing {tableData.offset + 1}–{Math.min(tableData.offset + tableData.returned_rows, tableData.total_rows)} of {tableData.total_rows.toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={tableData.offset + tableData.returned_rows >= tableData.total_rows}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No data found in this table</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Empty state when no table is selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground max-w-sm">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <h3 className="font-medium mb-2">Select a table to browse</h3>
              <p className="text-sm">
                Choose a table from the sidebar to view its data and structure.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
