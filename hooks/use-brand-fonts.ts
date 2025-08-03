import type { FontInfo } from '@/lib/types/branding';
import { useQuery } from '@tanstack/react-query';

interface FontsResponse {
  fonts: FontInfo[];
}

// Hook for fetching brand fonts
export function useBrandFonts(projectId: number) {
  return useQuery({
    queryKey: ['brand-fonts', projectId],
    queryFn: async (): Promise<FontsResponse> => {
      const response = await fetch(`/api/projects/${projectId}/branding/fonts`);

      if (!response.ok) {
        throw new Error(`Failed to fetch fonts: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (fonts change less frequently)
    retry: 1,
  });
}
