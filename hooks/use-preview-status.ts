import type {
  PreviewStatusResponse,
  ServerHealthOptions,
  StartPreviewResponse,
  StopPreviewResponse,
} from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Hook for fetching preview status
export function usePreviewStatus(projectId: number, polling = true) {
  return useQuery({
    queryKey: ['preview-status', projectId],
    queryFn: async (): Promise<PreviewStatusResponse> => {
      const response = await fetch(`/api/projects/${projectId}/preview`);

      if (!response.ok) {
        throw new Error('Failed to fetch preview status');
      }

      return response.json();
    },
    refetchInterval: polling ? 3000 : false, // Poll every 3 seconds when enabled
    staleTime: 1000, // Consider data stale after 1 second
    retry: 2,
  });
}

// Hook for starting preview
export function useStartPreview(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<StartPreviewResponse> => {
      const response = await fetch(`/api/projects/${projectId}/preview`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start preview');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch preview status
      queryClient.invalidateQueries({ queryKey: ['preview-status', projectId] });
    },
  });
}

// Hook for stopping preview
export function useStopPreview(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<StopPreviewResponse> => {
      const response = await fetch(`/api/projects/${projectId}/preview/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop preview');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch preview status
      queryClient.invalidateQueries({ queryKey: ['preview-status', projectId] });
    },
  });
}

// Utility function for server health checks
export async function checkServerHealth(options: ServerHealthOptions): Promise<boolean> {
  const { url, timeout = 3000 } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}
