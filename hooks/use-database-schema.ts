import { useQuery } from '@tanstack/react-query';
import type { DatabaseSchema } from '@/lib/types';

export function useDatabaseSchema(projectId: number) {
  return useQuery({
    queryKey: ['database-schema', projectId],
    queryFn: async (): Promise<DatabaseSchema> => {
      const response = await fetch(`/api/projects/${projectId}/database/schema`);
      if (!response.ok) {
        throw new Error('Failed to fetch database schema');
      }
      const data = await response.json();
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}