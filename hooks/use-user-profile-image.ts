'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

type UserProfileData = {
  imageUrl: string | null;
  name: string | null;
  email: string;
};

async function fetchUserProfile(): Promise<UserProfileData> {
  const response = await fetch('/api/user/profile');
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  const data = await response.json();
  return data;
}

export function useUserProfileImage() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const { data: dbUser, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    enabled: isClerkLoaded && !!clerkUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Return the database image URL if available, otherwise fall back to Clerk's image URL
  const imageUrl = dbUser?.imageUrl || clerkUser?.imageUrl || '';

  return {
    imageUrl,
    isLoading: !isClerkLoaded || isLoading,
    isLoaded: isClerkLoaded && !isLoading,
  };
}
