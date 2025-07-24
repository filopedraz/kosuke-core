# 📋 Ticket 17: Database Management Tab

**Priority:** Medium  
**Estimated Effort:** 5 hours

## Description

Add a database management tab to the project detail view that allows users to view their project's database schema, browse table data, and execute simple queries. Each project has its own SQLite database, and operations should be proxied through the Python microservice for security and consistency.

## Files to Create/Update

```
app/(logged-in)/projects/[id]/components/database/
├── database-tab.tsx
├── schema-viewer.tsx
├── table-browser.tsx
├── query-runner.tsx
├── connection-status.tsx
└── skeletons/
    ├── schema-viewer-skeleton.tsx
    ├── table-browser-skeleton.tsx
    └── query-runner-skeleton.tsx
app/(logged-in)/projects/[id]/page.tsx (add database tab)
app/api/projects/[id]/database/schema/route.ts
app/api/projects/[id]/database/tables/[table]/route.ts
app/api/projects/[id]/database/query/route.ts
hooks/use-database-schema.ts
hooks/use-database-query.ts
hooks/use-table-data.ts
lib/types/database.ts (centralized database types)
agent/app/api/routes/database.py
agent/app/services/database_service.py
agent/app/models/database.py
```

## Implementation Details

**app/(logged-in)/projects/[id]/components/database/database-tab.tsx** - Main database interface:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Table, Search, Play } from 'lucide-react';
import { SchemaViewer } from './schema-viewer';
import { TableBrowser } from './table-browser';
import { QueryRunner } from './query-runner';
import { ConnectionStatus } from './connection-status';

interface DatabaseTabProps {
  projectId: number;
}

interface DatabaseInfo {
  connected: boolean;
  database_path: string;
  tables_count: number;
  database_size: string;
}

export function DatabaseTab({ projectId }: DatabaseTabProps) {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatabaseInfo();
  }, [projectId]);

  async function fetchDatabaseInfo() {
    try {
      const response = await fetch(`/api/projects/${projectId}/database/info`);
      if (response.ok) {
        const data = await response.json();
        setDbInfo(data);
      }
    } catch (error) {
      console.error('Error fetching database info:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
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
              <CardDescription>Manage your project's SQLite database</CardDescription>
            </div>
            <ConnectionStatus connected={dbInfo?.connected || false} />
          </div>
        </CardHeader>
        <CardContent>
          {dbInfo && (
            <div className="grid grid-cols-3 gap-4">
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
          <SchemaViewer projectId={projectId} />
        </TabsContent>

        <TabsContent value="browse" className="mt-6">
          <TableBrowser projectId={projectId} />
        </TabsContent>

        <TabsContent value="query" className="mt-6">
          <QueryRunner projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/database/schema-viewer.tsx** - Database schema display:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Key, Hash, Type } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key?: string;
}

interface TableSchema {
  name: string;
  columns: Column[];
  row_count: number;
}

interface SchemaViewerProps {
  projectId: number;
}

export function SchemaViewer({ projectId }: SchemaViewerProps) {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchema();
  }, [projectId]);

  async function fetchSchema() {
    try {
      const response = await fetch(`/api/projects/${projectId}/database/schema`);
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Error fetching schema:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading schema...</div>;
  }

  if (tables.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">No tables found in database</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tables.map(table => (
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
                    className="flex items-center justify-between p-2 rounded border border-gray-800 bg-gray-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {column.primary_key && <Key className="w-3 h-3 text-yellow-500" />}
                        {column.foreign_key && <Hash className="w-3 h-3 text-blue-500" />}
                        <Type className="w-3 h-3 text-gray-400" />
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
```

**app/api/projects/[id]/database/schema/route.ts** - Database schema API:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/database/schema/${projectId}`);

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch database schema', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching database schema:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**agent/app/services/database_service.py** - Database operations service:

```python
import sqlite3
import os
from typing import List, Dict, Any, Optional
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self, project_id: int):
        self.project_id = project_id
        self.db_path = f"{settings.PROJECTS_DIR}/{project_id}/database.sqlite"

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        if not os.path.exists(self.db_path):
            # Create database if it doesn't exist
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            conn.close()

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    async def get_database_info(self) -> Dict[str, Any]:
        """Get basic database information"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Get table count
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
            tables_count = cursor.fetchone()[0]

            # Get database size
            db_size = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
            db_size_str = f"{db_size / 1024:.1f} KB" if db_size < 1024*1024 else f"{db_size / (1024*1024):.1f} MB"

            conn.close()

            return {
                "connected": True,
                "database_path": self.db_path,
                "tables_count": tables_count,
                "database_size": db_size_str
            }
        except Exception as e:
            logger.error(f"Error getting database info: {e}")
            return {
                "connected": False,
                "database_path": self.db_path,
                "tables_count": 0,
                "database_size": "0 KB"
            }

    async def get_schema(self) -> Dict[str, Any]:
        """Get database schema information"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            table_names = [row[0] for row in cursor.fetchall()]

            tables = []
            for table_name in table_names:
                # Get table info
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns_info = cursor.fetchall()

                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                row_count = cursor.fetchone()[0]

                # Get foreign keys
                cursor.execute(f"PRAGMA foreign_key_list({table_name})")
                foreign_keys = {row[3]: f"{row[2]}.{row[4]}" for row in cursor.fetchall()}

                columns = []
                for col in columns_info:
                    columns.append({
                        "name": col[1],
                        "type": col[2],
                        "nullable": not col[3],
                        "primary_key": bool(col[5]),
                        "foreign_key": foreign_keys.get(col[1])
                    })

                tables.append({
                    "name": table_name,
                    "columns": columns,
                    "row_count": row_count
                })

            conn.close()
            return {"tables": tables}

        except Exception as e:
            logger.error(f"Error getting database schema: {e}")
            raise Exception(f"Failed to get database schema: {str(e)}")

    async def get_table_data(self, table_name: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get data from a specific table"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Validate table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                raise Exception(f"Table '{table_name}' does not exist")

            # Get total count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            total_rows = cursor.fetchone()[0]

            # Get data with pagination
            cursor.execute(f"SELECT * FROM {table_name} LIMIT ? OFFSET ?", (limit, offset))
            rows = cursor.fetchall()

            # Convert to list of dicts
            data = [dict(row) for row in rows]

            conn.close()

            return {
                "table_name": table_name,
                "total_rows": total_rows,
                "returned_rows": len(data),
                "limit": limit,
                "offset": offset,
                "data": data
            }

        except Exception as e:
            logger.error(f"Error getting table data: {e}")
            raise Exception(f"Failed to get table data: {str(e)}")

    async def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute a SELECT query safely"""
        try:
            # Only allow SELECT queries for security
            query_upper = query.strip().upper()
            if not query_upper.startswith('SELECT'):
                raise Exception("Only SELECT queries are allowed")

            conn = self._get_connection()
            cursor = conn.cursor()

            cursor.execute(query)
            rows = cursor.fetchall()

            # Get column names
            columns = [description[0] for description in cursor.description] if cursor.description else []

            # Convert to list of dicts
            data = [dict(zip(columns, row)) for row in rows]

            conn.close()

            return {
                "columns": columns,
                "rows": len(data),
                "data": data,
                "query": query
            }

        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise Exception(f"Failed to execute query: {str(e)}")
```

## Acceptance Criteria

- [x] Database management tab in project detail view
- [x] Schema viewer showing tables, columns, and relationships
- [x] Table data browser with pagination
- [x] Safe query runner (SELECT only)
- [x] Connection status and database information
- [x] All operations proxied through Python microservice
