import type { ApiResponse } from '@/lib/api';
import type { GitHubRepository } from '@/lib/types/github';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useGitHubRepositories(
  userId: string,
  enabled: boolean = true,
  search: string = ''
) {
  const query = useInfiniteQuery({
    queryKey: ['github-repositories', userId, search],
    queryFn: async ({
      pageParam,
    }): Promise<{ repositories: GitHubRepository[]; hasMore: boolean }> => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        per_page: '10',
      });
      if (search) {
        params.append('search', search);
      }
      const response = await fetch(`/api/auth/github/repositories?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub repositories');
      }
      const data: ApiResponse<{ repositories: GitHubRepository[]; hasMore: boolean }> =
        await response.json();
      return data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      return lastPage.hasMore ? lastPageParam + 1 : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!userId && enabled, // Only fetch when explicitly enabled
  });

  // Flatten all pages into single array
  const repositories = useMemo(
    () => query.data?.pages.flatMap(page => page.repositories) ?? [],
    [query.data?.pages]
  );

  return {
    ...query,
    repositories,
  };
}
