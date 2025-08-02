import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { 
  UserProfile, 
  ProfileFormData, 
  UpdateProfileResponse,
  FormState 
} from '@/lib/types';

// Hook for fetching user profile
export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async (): Promise<UserProfile> => {
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      const data = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Hook for updating user profile
export function useUpdateProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
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
    onSuccess: (data) => {
      toast({
        title: "Profile updated",
        description: data.success,
      });

      // Invalidate and refetch user profile
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    },
  });
}

// Hook for updating profile image
export function useUpdateProfileImage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
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
    onSuccess: (data) => {
      toast({
        title: "Profile image updated",
        description: data.success,
      });

      // Invalidate user profile to refetch updated image
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Image update failed",
        description: error instanceof Error ? error.message : "Failed to update profile image",
        variant: "destructive",
      });
    },
  });
}

// Hook for deleting user account
export function useDeleteAccount() {
  const { toast } = useToast();
  const router = useRouter();

  return useMutation({
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
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      
      // Redirect to home page
      router.push('/');
    },
    onError: (error) => {
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    },
  });
}