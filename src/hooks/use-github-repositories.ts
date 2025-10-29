import type { ApiResponse } from '@/lib/api';
import type { GitHubRepository } from '@/lib/types/github';
import { useQuery } from '@tanstack/react-query';

export function useGitHubRepositories(userId: string) {
  return useQuery({
    queryKey: ['github-repositories', userId],
    queryFn: async (): Promise<GitHubRepository[]> => {
      const response = await fetch(`/api/auth/github/repositories`);
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub repositories');
      }
      const data: ApiResponse<{ repositories: GitHubRepository[] }> = await response.json();
      return data.data.repositories;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!userId,
  });
}
