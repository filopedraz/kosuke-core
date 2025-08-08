'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDatabaseInfo } from '@/hooks/use-database-info';
import type { DatabaseTabProps } from '@/lib/types';
import { Database, Play, Search, Table } from 'lucide-react';
import { ConnectionStatus } from './connection-status';
import { QueryRunner } from './query-runner';
import { SchemaViewer } from './schema-viewer';
import { DatabaseTabSkeleton } from './skeletons/database-tab-skeleton';
import { TableBrowser } from './table-browser';

export function DatabaseTab({ projectId, sessionId }: DatabaseTabProps) {
  const { data: dbInfo, isLoading } = useDatabaseInfo(projectId, sessionId);

  if (isLoading) {
    return <DatabaseTabSkeleton />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Database Management</h1>
          </div>
          <ConnectionStatus connected={dbInfo?.connected || false} />
        </div>
      </div>

      <div className="flex-shrink-0 px-6 pb-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Project Database
                </CardTitle>
                <CardDescription className="pt-2">
                  Manage your project&apos;s PostgreSQL database
                  {sessionId ? ` (Session: ${sessionId})` : ' (Main Branch)'}
                </CardDescription>
              </div>
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
      </div>

      <div className="flex-1 overflow-hidden px-6">
        <Tabs defaultValue="schema" className="w-full h-full flex flex-col">
          <TabsList className="flex-shrink-0">
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

          <TabsContent value="schema" className="flex-1 overflow-y-auto pt-6 pb-12">
            <div className="space-y-6">
              <SchemaViewer projectId={projectId} sessionId={sessionId} />
            </div>
          </TabsContent>

          <TabsContent value="browse" className="flex-1 overflow-hidden pt-6 pb-6">
            <TableBrowser projectId={projectId} sessionId={sessionId} />
          </TabsContent>

          <TabsContent value="query" className="flex-1 overflow-y-auto pt-6 pb-12">
            <div className="space-y-6">
              <QueryRunner projectId={projectId} sessionId={sessionId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
