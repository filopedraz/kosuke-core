import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import type { AuthStatus } from '@/lib/types/auth';

export function useAuthStatus() {
  const { userId, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['auth-status', userId],
    queryFn: async (): Promise<AuthStatus> => {
      const response = await fetch('/api/auth/status');
      if (!response.ok) {
        throw new Error('Failed to fetch auth status');
      }

      const data = await response.json();
      return data;
    },
    enabled: isLoaded,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}

export function useRequireAuth() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  return {
    isLoaded,
    isSignedIn,
    userId,
    isReady: isLoaded && isSignedIn,
    requiresAuth: isLoaded && !isSignedIn,
  };
}
