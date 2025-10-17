import type { ApiSuccess } from '@/lib/types';
import type { PreviewUrlsResponse, PreviewUrlStats } from '@/lib/types/preview-urls';
import { useQuery } from '@tanstack/react-query';

export function useProjectPreviewUrls(projectId: number) {
  return useQuery({
    queryKey: ['project-preview-urls', projectId],
    queryFn: async (): Promise<PreviewUrlsResponse> => {
      const response = await fetch(`/api/projects/${projectId}/preview-urls`);
      if (!response.ok) {
        throw new Error('Failed to fetch project preview URLs');
      }
      const data: ApiSuccess<PreviewUrlsResponse> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
}

export function usePreviewUrlStats() {
  return useQuery({
    queryKey: ['preview-url-stats'],
    queryFn: async (): Promise<PreviewUrlStats> => {
      const response = await fetch('/api/preview-urls/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch preview URL stats');
      }
      const data: ApiSuccess<PreviewUrlStats> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
