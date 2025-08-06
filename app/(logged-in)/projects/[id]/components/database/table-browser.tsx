'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDatabaseSchema } from '@/hooks/use-database-schema';
import { useTableData } from '@/hooks/use-table-data';
import type { TableBrowserProps } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { TableBrowserSkeleton } from './skeletons/table-browser-skeleton';

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
    <div className="space-y-4">
      {/* Table selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTable || ''} onValueChange={setSelectedTable}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a table to browse" />
            </SelectTrigger>
            <SelectContent>
              {tables.map(table => (
                <SelectItem key={table.name} value={table.name}>
                  {table.name} ({table.row_count} rows)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table data */}
      {selectedTable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedTable}</CardTitle>
              {tableData && (
                <Badge variant="secondary">
                  {tableData.total_rows} total rows
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading table data...</div>
              </div>
            ) : error ? (
              <div className="text-center text-destructive">
                Error loading table data: {error.message}
              </div>
            ) : tableData && tableData.data.length > 0 ? (
              <>
                {/* Table */}
                <div className="rounded-md border overflow-auto max-h-96">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {Object.keys(tableData.data[0]).map(column => (
                          <th key={column} className="p-2 text-left font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.data.map((row, index) => (
                        <tr key={index} className="border-b">
                          {Object.values(row).map((value, colIndex) => (
                            <td key={colIndex} className="p-2 font-mono text-sm">
                              {value === null ? (
                                <span className="text-muted-foreground italic">NULL</span>
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {tableData.offset + 1} to {Math.min(tableData.offset + tableData.returned_rows, tableData.total_rows)} of {tableData.total_rows} rows
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
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                No data found in this table
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
