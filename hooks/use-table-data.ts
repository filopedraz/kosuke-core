import { useQuery } from '@tanstack/react-query';
import type { TableData } from '@/lib/types';

export function useTableData(
  projectId: number,
  tableName: string | null,
  sessionId?: string | null,
  limit: number = 100,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['table-data', projectId, sessionId || 'main', tableName, limit, offset],
    queryFn: async (): Promise<TableData> => {
      if (!tableName) {
        throw new Error('Table name is required');
      }

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      // Use session-specific API when sessionId is provided, otherwise use main database
      const url = sessionId
        ? `/api/projects/${projectId}/chat-sessions/${sessionId}/database/tables/${tableName}?${params}`
        : `/api/projects/${projectId}/database/tables/${tableName}?${params}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch table data');
      }

      const data = await response.json();
      return data;
    },
    enabled: !!tableName,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}
