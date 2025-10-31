export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key: string | null;
}

export interface TableSchema {
  name: string;
  columns: Column[];
  row_count: number;
}

export interface DatabaseInfo {
  connected: boolean;
  database_path: string;
  tables_count: number;
  database_size: string;
}

export interface DatabaseSchema {
  tables: TableSchema[];
}

export interface TableData {
  table_name: string;
  total_rows: number;
  returned_rows: number;
  limit: number;
  offset: number;
  data: Record<string, unknown>[];
}

export interface QueryResult {
  columns: string[];
  rows: number;
  data: Record<string, unknown>[];
  query: string;
}

export interface DatabaseTabProps {
  projectId: number;
  sessionId: string;
}

export interface SchemaViewerProps {
  projectId: number;
  sessionId: string;
}

export interface TableBrowserProps {
  projectId: number;
  sessionId: string;
}

export interface QueryRunnerProps {
  projectId: number;
  sessionId: string;
}

export interface ConnectionStatusProps {
  connected: boolean;
}
