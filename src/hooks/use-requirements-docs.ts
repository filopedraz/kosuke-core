import { useQuery } from '@tanstack/react-query';

import type { RequirementsDocument } from '@/lib/types/project';

/**
 * Hook to poll for requirements document (docs.md) updates
 */
export function useRequirementsDocs(projectId: number, enabled: boolean = true) {
  return useQuery<RequirementsDocument>({
    queryKey: ['requirements-docs', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/requirements/docs`);

      if (!response.ok) {
        throw new Error('Failed to fetch requirements document');
      }

      const data: RequirementsDocument = await response.json();
      return data;
    },
    enabled: enabled && !!projectId,
    refetchInterval: 3000, // Poll every 3 seconds
    staleTime: 0, // Always consider data stale to enable polling
    retry: 1,
  });
}

