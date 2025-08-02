'use client';

import { useToast } from '@/hooks/use-toast';
import type {
  ApiSuccess,
  DatabaseUser,
  EnhancedUser,
  UpdateProfileResponse,
  UseUserReturn,
} from '@/lib/types';
import { useUser as useClerkUser } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

// Helper function to create enhanced user from database user and Clerk user
function createEnhancedUser(dbUser: DatabaseUser, clerkUser: any): EnhancedUser {
  const firstName = dbUser.name?.split(' ')[0] || clerkUser?.firstName || '';
  const lastName = dbUser.name?.split(' ').slice(1).join(' ') || clerkUser?.lastName || '';

  const fullName =
    dbUser.name || `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || '';
  const displayName = fullName || dbUser.email.split('@')[0] || 'User';

  // Create initials from name or email
  const initials = fullName
    ? fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : dbUser.email[0].toUpperCase();

  return {
    ...dbUser,
    clerkUser,
    fullName,
    displayName,
    initials,
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

  // Fetch database user data
  const {
    data: dbUser,
    isLoading: isDbUserLoading,
    error: dbUserError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['user', clerkUser?.id],
    queryFn: async (): Promise<DatabaseUser | null> => {
      if (!clerkUser) return null;

      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        if (response.status === 404) {
          // User not found in database yet (might be syncing)
          return null;
        }
        throw new Error('Failed to fetch user profile');
      }

      const data: ApiSuccess<DatabaseUser> = await response.json();
      return data.data;
    },
    enabled: isClerkLoaded && !!clerkUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (user not found)
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData): Promise<UpdateProfileResponse> => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      return result;
    },
    onSuccess: data => {
      toast({
        title: 'Profile updated',
        description: data.success,
      });

      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['user', clerkUser?.id] });
      router.refresh();
    },
    onError: error => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
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
    if (!dbUser || !clerkUser) return null;
    return createEnhancedUser(dbUser, clerkUser);
  }, [dbUser, clerkUser]);

  const imageUrl = useMemo(() => {
    return dbUser?.imageUrl || clerkUser?.imageUrl || null;
  }, [dbUser?.imageUrl, clerkUser?.imageUrl]);

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
  const isLoading = !isClerkLoaded || isDbUserLoading;
  const isLoaded = isClerkLoaded && !isDbUserLoading;

  return {
    // Primary data
    user: enhancedUser,
    clerkUser: clerkUser || null,
    dbUser: dbUser || null,

    // Loading states
    isLoading,
    isLoaded,
    isSignedIn: isSignedIn || false,

    // Error states
    error: dbUserError as Error | null,

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
