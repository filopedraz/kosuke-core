import { useQuery } from '@tanstack/react-query';
import type { DatabaseInfo } from '@/lib/types';

export function useDatabaseInfo(projectId: number, sessionId?: string | null) {
  return useQuery({
    queryKey: ['database-info', projectId, sessionId || 'main'],
    queryFn: async (): Promise<DatabaseInfo> => {
      // Use session-specific API when sessionId is provided, otherwise use main database
      const url = sessionId
        ? `/api/projects/${projectId}/chat-sessions/${sessionId}/database/info`
        : `/api/projects/${projectId}/database/info`;
      
      const response = await fetch(url);
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