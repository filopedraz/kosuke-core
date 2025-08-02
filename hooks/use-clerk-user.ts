import { useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import type { UserProfile } from '@/lib/types/auth';
import type { ApiResponse } from '@/lib/api';

export function useClerkUser() {
  const { user, isLoaded, isSignedIn } = useUser();

  return {
    user,
    isLoaded,
    isSignedIn,
    // Convert Clerk user to our AuthUser type
    authUser: user
      ? {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          username: user.username,
          createdAt: new Date(user.createdAt || Date.now()),
          updatedAt: new Date(user.updatedAt || Date.now()),
        }
      : null,
  };
}

export function useUserProfile() {
  const { user, isLoaded, isSignedIn } = useUser();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async (): Promise<UserProfile> => {
      if (!user) throw new Error('No user found');

      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data: ApiResponse<UserProfile> = await response.json();
      return data.data;
    },
    enabled: isLoaded && isSignedIn && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
