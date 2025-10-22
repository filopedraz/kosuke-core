import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

import type { CompleteRequirementsResponse } from '@/lib/types/project';

/**
 * Hook to complete requirements gathering and transition project to active status
 */
export function useCompleteRequirements(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/requirements/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete requirements');
      }

      const data: CompleteRequirementsResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch project data
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      toast({
        title: 'Requirements Completed',
        description: 'Your project is now ready for development!',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete requirements',
        variant: 'destructive',
      });
    },
  });
}

