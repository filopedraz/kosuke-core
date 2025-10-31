import { useMutation } from '@tanstack/react-query';

import { useToast } from '@/hooks/use-toast';
import type { PullRequest, PullResponse } from '@/lib/types';

interface UsePullBranchOptions {
  projectId: string;
  sessionId: string;
  onSuccess?: (data: PullResponse) => void;
  onError?: (error: Error) => void;
}

export function usePullBranch({ projectId, sessionId, onSuccess, onError }: UsePullBranchOptions) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (pullRequest: PullRequest = {}): Promise<PullResponse> => {
      // Always use session-scoped endpoint
      const url = `/api/projects/${projectId}/chat-sessions/${sessionId}/pull`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pullRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to pull changes',
        }));
        throw new Error(errorData.error || 'Failed to pull changes');
      }

      return response.json();
    },
    onSuccess: data => {
      const branchText = `session ${sessionId}`;

      if (data.success) {
        const commitCount = data.pullResult.commitsPulled;
        const changed = data.pullResult.changed;

        if (changed && commitCount > 0) {
          toast({
            title: 'Successfully pulled changes',
            description: `Updated ${branchText} with ${commitCount} new commit${commitCount === 1 ? '' : 's'}`,
          });
        } else if (data.pullResult.message?.toLowerCase().includes('no remote')) {
          toast({
            title: 'Branch up to date',
            description: `No remote branch found for ${branchText}`,
          });
        } else {
          toast({
            title: 'Branch up to date',
            description: `${branchText} is already up to date`,
          });
        }

        if (data.container_restarted) {
          toast({
            title: 'Preview restarting',
            description: 'Container is restarting to apply changes',
          });
        }
      } else {
        throw new Error(data.pullResult?.message || 'Pull operation failed');
      }

      onSuccess?.(data);
    },
    onError: error => {
      const branchText = `session ${sessionId}`;

      console.error(`Error pulling ${branchText}:`, error);
      toast({
        variant: 'destructive',
        title: 'Pull failed',
        description: error instanceof Error ? error.message : `Failed to pull ${branchText}`,
      });

      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    },
  });
}
