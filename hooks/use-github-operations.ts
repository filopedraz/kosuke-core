import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  CreateRepositoryData,
  ImportRepositoryData,
  GitHubRepository,
} from '@/lib/types/github';
import type { ApiResponse } from '@/lib/api';

export function useCreateRepository(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRepositoryData): Promise<GitHubRepository> => {
      const response = await fetch(`/api/projects/${projectId}/github/create-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create repository');
      }

      const result: ApiResponse<GitHubRepository> = await response.json();
      return result.data;
    },
    onSuccess: repository => {
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: 'Repository Created',
        description: `Successfully created repository: ${repository.name}`,
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Create Repository',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useImportRepository(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportRepositoryData): Promise<GitHubRepository> => {
      const response = await fetch(`/api/projects/${projectId}/github/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to import repository');
      }

      const result: ApiResponse<GitHubRepository> = await response.json();
      return result.data;
    },
    onSuccess: repository => {
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: 'Repository Imported',
        description: `Successfully imported repository: ${repository.name}`,
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Import Repository',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDisconnectGitHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch('/api/auth/github/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to disconnect GitHub');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-status'] });
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] });
      toast({
        title: 'GitHub Disconnected',
        description: 'Successfully disconnected your GitHub account.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Disconnect',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
