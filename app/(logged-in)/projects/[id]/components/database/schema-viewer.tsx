'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDatabaseSchema } from '@/hooks/use-database-schema';
import type { SchemaViewerProps } from '@/lib/types';
import { Hash, Key, Table, Type } from 'lucide-react';
import { SchemaViewerSkeleton } from './skeletons/schema-viewer-skeleton';

export function SchemaViewer({ projectId, sessionId }: SchemaViewerProps) {
  const { data: schema, isLoading, error } = useDatabaseSchema(projectId, sessionId);

  if (isLoading) {
    return <SchemaViewerSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            Error loading schema: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!schema?.tables || schema.tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h3 className="text-xl font-medium">No Tables Found</h3>
        <p className="text-muted-foreground mt-2">
          This database doesn&apos;t have any tables yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schema.tables.map(table => (
        <Card key={table.name}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                {table.name}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {table.row_count} rows
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {table.columns.map(column => (
                  <div
                    key={column.name}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {column.primary_key && <Key className="w-3 h-3 text-yellow-500" />}
                        {column.foreign_key && <Hash className="w-3 h-3 text-blue-500" />}
                        <Type className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-mono text-sm">{column.name}</div>
                        {column.foreign_key && (
                          <div className="text-xs text-muted-foreground">
                            → {column.foreign_key}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {column.type}
                      </Badge>
                      {!column.nullable && (
                        <Badge variant="destructive" className="text-xs">
                          NOT NULL
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
