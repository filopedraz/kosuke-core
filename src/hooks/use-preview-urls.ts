import type { ApiSuccess } from '@/lib/types';
import type { PreviewUrlsResponse } from '@/lib/types/preview-urls';
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
