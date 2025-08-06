import { useQuery } from '@tanstack/react-query';
import type { DatabaseSchema } from '@/lib/types';

export function useDatabaseSchema(projectId: number, sessionId?: string | null) {
  return useQuery({
    queryKey: ['database-schema', projectId, sessionId || 'main'],
    queryFn: async (): Promise<DatabaseSchema> => {
      // Use session-specific API when sessionId is provided, otherwise use main database
      const url = sessionId
        ? `/api/projects/${projectId}/chat-sessions/${sessionId}/database/schema`
        : `/api/projects/${projectId}/database/schema`;
      
      const response = await fetch(url);
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