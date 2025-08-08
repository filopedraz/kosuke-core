'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDatabaseSchema } from '@/hooks/use-database-schema';
import { useTableData } from '@/hooks/use-table-data';
import type { TableBrowserProps } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BarChart3, ChevronLeft, ChevronRight, Columns, Database, Table as TableIcon } from 'lucide-react';
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
    <div className="flex h-full max-h-[700px] gap-6">
      {/* Left Sidebar - Tables List */}
      <Card className="w-72 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="w-5 h-5" />
            Database Tables
          </CardTitle>
          <CardDescription>
            {tables.length} {tables.length === 1 ? 'table' : 'tables'} available
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[500px]">
            {tables.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No tables found
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {tables.map(table => (
                  <button
                    key={table.name}
                    onClick={() => {
                      setSelectedTable(table.name);
                      setCurrentPage(0);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg hover:bg-muted/70 transition-all duration-200 group border",
                      selectedTable === table.name
                        ? "bg-muted border-border shadow-sm"
                        : "border-transparent hover:border-border/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <TableIcon className={cn(
                        "w-4 h-4 transition-colors",
                        selectedTable === table.name
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium text-sm truncate transition-colors",
                          selectedTable === table.name ? "text-foreground" : "text-foreground/90"
                        )}>
                          {table.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {table.row_count.toLocaleString()} rows
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedTable ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedTable}</CardTitle>
                  {tableData && (
                    <CardDescription>
                      {tableData.total_rows.toLocaleString()} total rows
                    </CardDescription>
                  )}
                </div>
                {tableData && (
                  <Badge variant="secondary" className="font-mono">
                    {tableData.returned_rows} / {tableData.total_rows}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col space-y-4 pb-6">
              <Tabs defaultValue="data" className="flex-1 flex flex-col">
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="data" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Data
                  </TabsTrigger>
                  <TabsTrigger value="structure" className="flex items-center gap-2">
                    <Columns className="w-4 h-4" />
                    Structure
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="flex-1 flex flex-col space-y-4">
                  {dataLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-muted-foreground">Loading table data...</div>
                    </div>
                  ) : error ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-destructive space-y-2">
                        <p className="font-medium">Error loading table data</p>
                        <p className="text-sm">{error.message}</p>
                      </div>
                    </div>
                  ) : tableData && tableData.data.length > 0 ? (
                    <>
                      {/* Table with horizontal scroll */}
                      <div className="flex-1 border rounded-lg">
                        <ScrollArea className="h-[400px] w-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {Object.keys(tableData.data[0]).map(column => (
                                  <TableHead key={column} className="min-w-32 bg-muted/30 font-semibold">
                                    {column}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tableData.data.map((row, index) => (
                                <TableRow key={index}>
                                  {Object.values(row).map((value, colIndex) => (
                                    <TableCell key={colIndex} className="min-w-32 font-mono text-xs">
                                      {value === null ? (
                                        <span className="text-muted-foreground italic">NULL</span>
                                      ) : (
                                        <div className="truncate max-w-48" title={String(value)}>
                                          {String(value)}
                                        </div>
                                      )}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-sm text-muted-foreground">
                          Showing <span className="font-medium">{tableData.offset + 1}–{Math.min(tableData.offset + tableData.returned_rows, tableData.total_rows)}</span> of <span className="font-medium">{tableData.total_rows.toLocaleString()}</span> rows
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={tableData.offset + tableData.returned_rows >= tableData.total_rows}
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground space-y-2">
                        <TableIcon className="w-12 h-12 mx-auto opacity-40" />
                        <p className="font-medium">No data found</p>
                        <p className="text-sm">This table appears to be empty</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="structure" className="flex-1">
                  <div className="text-center text-muted-foreground py-12">
                    <Columns className="w-12 h-12 mx-auto opacity-40 mb-4" />
                    <p className="font-medium">Table Structure</p>
                    <p className="text-sm">Column definitions and schema information will be displayed here</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <CardContent className="text-center space-y-4 py-12">
              <Database className="w-16 h-16 mx-auto text-muted-foreground/40" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Select a table to browse</h3>
                <p className="text-muted-foreground max-w-sm">
                  Choose a table from the sidebar to view its data, structure, and browse through records.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
