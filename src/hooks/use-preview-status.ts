import type { PreviewStatusResponse, StartPreviewResponse, StopPreviewResponse } from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Hook for fetching preview status
export function usePreviewStatus(
  projectId: number,
  sessionId: string,
  polling = true,
  enabled = true
) {
  return useQuery({
    queryKey: ['preview-status', projectId, sessionId],
    queryFn: async (): Promise<PreviewStatusResponse> => {
      const url = `/api/projects/${projectId}/chat-sessions/${sessionId}/preview`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch preview status');
      }

      return response.json();
    },
    refetchInterval: polling ? 3000 : false, // Poll every 3 seconds when enabled
    staleTime: 1000, // Consider data stale after 1 second
    retry: 2,
    enabled: enabled && Boolean(sessionId),
  });
}

// Hook for starting preview
export function useStartPreview(projectId: number, sessionId: string) {
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

// Hook for stopping preview
export function useStopPreview(projectId: number, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<StopPreviewResponse> => {
      const url = `/api/projects/${projectId}/chat-sessions/${sessionId}/preview`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to stop preview');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch preview status
      queryClient.invalidateQueries({ queryKey: ['preview-status', projectId, sessionId] });
    },
  });
}
