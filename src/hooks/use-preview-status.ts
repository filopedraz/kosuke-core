import type { StartPreviewResponse } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Hook for starting preview
export function useStartPreview(projectId: string, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<StartPreviewResponse> => {
      const url = `/api/projects/${projectId}/chat-sessions/${sessionId}/preview`;

      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start preview');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch preview status
      queryClient.invalidateQueries({ queryKey: ['preview-status', projectId, sessionId] });
    },
  });
}
