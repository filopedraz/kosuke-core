import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { NotificationSettings, UpdateNotificationResponse } from '@/lib/types';

// Hook for fetching notification settings
export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<NotificationSettings> => {
      const response = await fetch('/api/user/notifications');

      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }

      const data = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Hook for updating notification settings
export function useUpdateNotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      settings: Partial<NotificationSettings>
    ): Promise<UpdateNotificationResponse> => {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update notification settings');
      }

      return result;
    },
    onMutate: async newSettings => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notification-settings'] });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<NotificationSettings>([
        'notification-settings',
      ]);

      // Optimistically update to the new value
      if (previousSettings) {
        queryClient.setQueryData(['notification-settings'], {
          ...previousSettings,
          ...newSettings,
        });
      }

      return { previousSettings };
    },
    onSuccess: data => {
      toast({
        title: 'Settings updated',
        description: data.success,
      });
    },
    onError: (error, __, context) => {
      // Revert the optimistic update on error
      if (context?.previousSettings) {
        queryClient.setQueryData(['notification-settings'], context.previousSettings);
      }

      toast({
        title: 'Update failed',
        description:
          error instanceof Error ? error.message : 'Failed to update notification settings',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });
}
