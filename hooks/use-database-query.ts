import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { QueryResult } from '@/lib/types';

export function useDatabaseQuery(projectId: number, sessionId?: string | null) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (query: string): Promise<QueryResult> => {
      // Use session-specific API when sessionId is provided, otherwise use main database
      const url = sessionId
        ? `/api/projects/${projectId}/chat-sessions/${sessionId}/database/query`
        : `/api/projects/${projectId}/database/query`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute query');
      }

      const data = await response.json();
      return data;
    },
    onError: error => {
      toast({
        title: 'Query Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: data => {
      toast({
        title: 'Query Executed',
        description: `Query returned ${data.rows} row${data.rows !== 1 ? 's' : ''}`,
      });
    },
  });
}
