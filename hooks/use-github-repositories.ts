import { useQuery } from '@tanstack/react-query';
import type { GitHubRepository } from '@/lib/types/github';
import type { ApiResponse } from '@/lib/api';

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

export function useGitHubStatus(userId: string) {
  return useQuery({
    queryKey: ['github-status', userId],
    queryFn: async () => {
      const response = await fetch('/api/auth/github/status');
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub status');
      }
      const data: ApiResponse<{
        connected: boolean;
        githubUsername?: string;
        githubId?: string;
        connectedAt?: string;
      }> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
    enabled: !!userId,
  });
}