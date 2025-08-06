import { useQuery } from '@tanstack/react-query';
import type { EnvironmentVariable } from '@/lib/types/environment';
import type { ApiResponse } from '@/lib/api';

export function useEnvironmentVariables(projectId: number) {
  return useQuery({
    queryKey: ['environment-variables', projectId],
    queryFn: async (): Promise<EnvironmentVariable[]> => {
      const response = await fetch(`/api/projects/${projectId}/environment`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch environment variables');
      }
      const data: ApiResponse<{ variables: EnvironmentVariable[] }> = await response.json();
      return data.data.variables;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
