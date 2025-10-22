import { useQuery } from '@tanstack/react-query';

import type { ChatSession } from '@/lib/db/schema';

interface RequirementsSessionResponse {
  session: ChatSession;
}

/**
 * Hook to fetch the requirements session for a project
 */
export function useRequirementsSession(projectId: number, enabled: boolean = true) {
  return useQuery<ChatSession>({
    queryKey: ['requirements-session', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/requirements/session`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Requirements session not found');
        }
        throw new Error('Failed to fetch requirements session');
      }

      const data: RequirementsSessionResponse = await response.json();
      return data.session;
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

