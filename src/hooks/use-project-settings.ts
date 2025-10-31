import { useToast } from '@/hooks/use-toast';
import type {
  CreatePullRequestData,
  CreatePullRequestResponse,
  DefaultBranchSettings,
  UpdateDefaultBranchData,
} from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Hook to get default branch settings
export function useDefaultBranchSettings(projectId: string) {
  return useQuery({
    queryKey: ['default-branch-settings', projectId],
    queryFn: async (): Promise<DefaultBranchSettings> => {
      const response = await fetch(`/api/projects/${projectId}/settings/default-branch`);
      if (!response.ok) {
        throw new Error('Failed to fetch default branch settings');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
}

// Hook to update default branch
export function useUpdateDefaultBranch(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDefaultBranchData) => {
      const response = await fetch(`/api/projects/${projectId}/settings/default-branch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update default branch');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-branch-settings', projectId] });
      toast({
        title: 'Success',
        description: 'Default branch updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to create pull request from chat session
export function useCreatePullRequest(projectId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: CreatePullRequestData;
    }): Promise<CreatePullRequestResponse> => {
      const response = await fetch(
        `/api/projects/${projectId}/chat-sessions/${sessionId}/pull-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create pull request');
      }

      return response.json();
    },
    onSuccess: data => {
      toast({
        title: 'Redirecting to GitHub',
        description: 'Opening GitHub pull request creation page...',
      });

      // Open GitHub PR creation page in new tab
      window.open(data.pull_request_url, '_blank');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
