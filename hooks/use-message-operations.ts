import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { RevertToMessageRequest, RevertToMessageResponse } from '@/lib/types/chat';
import type { ApiResponse } from '@/lib/api';

export function useRevertToMessage(projectId: number, chatSessionId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RevertToMessageRequest): Promise<RevertToMessageResponse> => {
      const response = await fetch(
        `/api/projects/${projectId}/chat-sessions/${chatSessionId}/revert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to revert to message state');
      }

      const result: ApiResponse<RevertToMessageResponse> = await response.json();
      return result.data;
    },
    onSuccess: result => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['chat-messages', projectId, chatSessionId] });
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });

      toast({
        title: 'Reverted Successfully',
        description: `Reverted to commit ${result.reverted_to_commit.slice(0, 7)}`,
      });
    },
    onError: error => {
      toast({
        title: 'Revert Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}