'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import type { User } from '@/lib/db/schema';

/**
 * Hook to fetch the current user's database record
 * This returns the actual database User type, not the Clerk user
 */
export function useCurrentUser() {
  const { user: clerkUser, isLoaded } = useUser();

  return useQuery<User | null>({
    queryKey: ['current-user', clerkUser?.id],
    queryFn: async (): Promise<User | null> => {
      if (!clerkUser) return null;

      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        if (response.status === 404) {
          // User not found in database yet (might be syncing)
          return null;
        }
        throw new Error('Failed to fetch user profile');
      }

      const user = await response.json();
      return user;
    },
    enabled: isLoaded && !!clerkUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (user not found)
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}