import { useQuery } from '@tanstack/react-query';
import type { DatabaseInfo } from '@/lib/types';

export function useDatabaseInfo(projectId: number) {
  return useQuery({
    queryKey: ['database-info', projectId],
    queryFn: async (): Promise<DatabaseInfo> => {
      const response = await fetch(`/api/projects/${projectId}/database/info`);
      if (!response.ok) {
        throw new Error('Failed to fetch database info');
      }
      const data = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}