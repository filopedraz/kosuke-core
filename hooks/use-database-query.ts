import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { QueryResult } from '@/lib/types';

export function useDatabaseQuery(projectId: number) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (query: string): Promise<QueryResult> => {
      const response = await fetch(`/api/projects/${projectId}/database/query`, {
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
    onError: (error) => {
      toast({
        title: 'Query Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Query Executed',
        description: `Query returned ${data.rows} row${data.rows !== 1 ? 's' : ''}`,
      });
    },
  });
}