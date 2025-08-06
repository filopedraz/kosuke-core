'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Table, Search, Play } from 'lucide-react';
import { SchemaViewer } from './schema-viewer';
import { TableBrowser } from './table-browser';
import { QueryRunner } from './query-runner';
import { ConnectionStatus } from './connection-status';
import { useDatabaseInfo } from '@/hooks/use-database-info';
import type { DatabaseTabProps } from '@/lib/types';

export function DatabaseTab({ projectId, sessionId }: DatabaseTabProps) {
  const { data: dbInfo, isLoading } = useDatabaseInfo(projectId, sessionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading database information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Project Database
              </CardTitle>
              <CardDescription>
                Manage your project's SQLite database
                {sessionId ? ` (Session: ${sessionId})` : ' (Main Branch)'}
              </CardDescription>
            </div>
            <ConnectionStatus connected={dbInfo?.connected || false} />
          </div>
        </CardHeader>
        <CardContent>
          {dbInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {dbInfo.tables_count} table{dbInfo.tables_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Size: {dbInfo.database_size}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={dbInfo.connected ? 'default' : 'destructive'} className="text-xs">
                  {dbInfo.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="schema" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Browse Data
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Query
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-6">
          <SchemaViewer projectId={projectId} sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="browse" className="mt-6">
          <TableBrowser projectId={projectId} sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="query" className="mt-6">
          <QueryRunner projectId={projectId} sessionId={sessionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}