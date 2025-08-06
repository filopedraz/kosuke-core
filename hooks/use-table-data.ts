import { useQuery } from '@tanstack/react-query';
import type { TableData } from '@/lib/types';

export function useTableData(
  projectId: number,
  tableName: string | null,
  limit: number = 100,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['table-data', projectId, tableName, limit, offset],
    queryFn: async (): Promise<TableData> => {
      if (!tableName) {
        throw new Error('Table name is required');
      }
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      const response = await fetch(
        `/api/projects/${projectId}/database/tables/${tableName}?${params}`
      );
      
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