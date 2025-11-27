import type { ApiResponse } from '@/lib/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface GitHubOrganization {
  login: string;
  id: number;
}

export function useGitHubOrganizations(userId: string, enabled: boolean = true) {
  const query = useInfiniteQuery({
    queryKey: ['github-organizations', userId],
    queryFn: async ({
      pageParam,
    }): Promise<{ organizations: GitHubOrganization[]; hasMore: boolean }> => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        per_page: '10',
      });

      const response = await fetch(`/api/auth/github/organizations?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub organizations');
      }
      const data: ApiResponse<{
        organizations: GitHubOrganization[];
        hasMore: boolean;
      }> = await response.json();
      return data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      return lastPage.hasMore ? lastPageParam + 1 : undefined;
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    enabled: !!userId && enabled,
  });

  const organizations = useMemo(
    () => query.data?.pages.flatMap(page => page.organizations) ?? [],
    [query.data?.pages]
  );

  return {
    ...query,
    organizations,
  };
}
