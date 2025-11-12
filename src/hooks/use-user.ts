'use client';

import { useToast } from '@/hooks/use-toast';
import type {
  ApiSuccess,
  EnhancedUser,
  UpdateProfileResponse,
  UseUserReturn,
  UserProfile,
} from '@/lib/types';
import { useUser as useClerkUser } from '@clerk/nextjs';
import type { User as ClerkUser_SDK } from '@clerk/nextjs/server';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

// Helper function to create enhanced user from UserProfile and Clerk SDK user
function createEnhancedUser(userProfile: UserProfile, clerkUser: ClerkUser_SDK): EnhancedUser {
  const fullName = userProfile.name || '';
  const nameParts = fullName.split(' ').filter(Boolean);
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : nameParts[0]
        ? nameParts[0][0].toUpperCase()
        : userProfile.email[0].toUpperCase();

  return {
    ...userProfile,
    clerkUser,
    fullName,
    initials,
    displayName: fullName || userProfile.email.split('@')[0] || 'User',
  };
}

/**
 * Comprehensive user hook that provides all user-related data and operations
 * This is the single source of truth for user data across the application
 */
export function useUser(): UseUserReturn {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useClerkUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch user profile from API
  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['user', clerkUser?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!clerkUser) return null;

      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch user profile');
      }

      const data: ApiSuccess<UserProfile> = await response.json();
      return data.data;
    },
    enabled: isClerkLoaded && !!clerkUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData): Promise<UpdateProfileResponse> => {
      const firstName = formData.get('firstName') as string;
      const lastName = formData.get('lastName') as string;
      const marketingEmails = formData.get('marketingEmails') === 'true';

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, marketingEmails }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', clerkUser?.id] });
      toast({ title: 'Success', description: 'Profile updated successfully' });
      router.refresh();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Profile image update mutation
  const updateProfileImageMutation = useMutation({
    mutationFn: async (file: File): Promise<UpdateProfileResponse> => {
      const formData = new FormData();
      formData.set('profileImage', file);

      const response = await fetch('/api/user/profile-image', {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile image');
      }

      return result;
    },
    onSuccess: data => {
      toast({
        title: 'Profile image updated',
        description: data.success,
      });

      // Invalidate user data to refetch updated image
      queryClient.invalidateQueries({ queryKey: ['user', clerkUser?.id] });
      router.refresh();
    },
    onError: error => {
      toast({
        title: 'Image update failed',
        description: error instanceof Error ? error.message : 'Failed to update profile image',
        variant: 'destructive',
      });
    },
  });

  // Account deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete account');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      // Redirect to home page
      router.push('/');
    },
    onError: error => {
      toast({
        title: 'Deletion failed',
        description: error instanceof Error ? error.message : 'Failed to delete account',
        variant: 'destructive',
      });
    },
  });

  // Computed values
  const enhancedUser = useMemo((): EnhancedUser | null => {
    if (!userProfile || !clerkUser) return null;
    return createEnhancedUser(userProfile, clerkUser as unknown as ClerkUser_SDK);
  }, [userProfile, clerkUser]);

  const imageUrl = useMemo(() => {
    return userProfile?.imageUrl || clerkUser?.imageUrl || null;
  }, [userProfile?.imageUrl, clerkUser?.imageUrl]);

  const displayName = useMemo(() => {
    if (enhancedUser) return enhancedUser.displayName;
    if (clerkUser) {
      const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
      return name || clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
    }
    return 'User';
  }, [enhancedUser, clerkUser]);

  const initials = useMemo(() => {
    if (enhancedUser) return enhancedUser.initials;
    if (clerkUser) {
      const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
      if (name) {
        return name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      }
      return clerkUser.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || 'U';
    }
    return 'U';
  }, [enhancedUser, clerkUser]);

  // Action callbacks
  const updateProfile = useCallback(
    async (formData: FormData) => {
      await updateProfileMutation.mutateAsync(formData);
    },
    [updateProfileMutation]
  );

  const updateProfileImage = useCallback(
    async (file: File) => {
      await updateProfileImageMutation.mutateAsync(file);
    },
    [updateProfileImageMutation]
  );

  const deleteAccount = useCallback(async () => {
    await deleteAccountMutation.mutateAsync();
  }, [deleteAccountMutation]);

  const refresh = useCallback(async () => {
    await refetchUser();
  }, [refetchUser]);

  // Loading states
  const isLoading = !isClerkLoaded || isProfileLoading;
  const isLoaded = isClerkLoaded && !isProfileLoading;

  return {
    // Primary data
    user: enhancedUser,
    clerkUser: clerkUser as unknown as ClerkUser_SDK | null,

    // Loading states
    isLoading,
    isLoaded,
    isSignedIn: isSignedIn || false,

    // Error states
    error: profileError as Error | null,

    // Computed helpers
    imageUrl,
    displayName,
    initials,

    // Mutations
    updateProfile,
    updateProfileImage,
    deleteAccount,

    // Utilities
    refresh,
  };
}
