import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  CreateEnvironmentVariableData,
  UpdateEnvironmentVariableData,
  EnvironmentVariable,
} from '@/lib/types/environment';
import type { ApiResponse } from '@/lib/api';

export function useCreateEnvironmentVariable(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEnvironmentVariableData): Promise<EnvironmentVariable> => {
      const response = await fetch(`/api/projects/${projectId}/environment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create environment variable');
      }

      const result: ApiResponse<EnvironmentVariable> = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-variables', projectId] });
      toast({
        title: 'Environment Variable Created',
        description: 'The environment variable has been created successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Create Variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEnvironmentVariable(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateEnvironmentVariableData;
    }): Promise<EnvironmentVariable> => {
      const response = await fetch(`/api/projects/${projectId}/environment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update environment variable');
      }

      const result: ApiResponse<EnvironmentVariable> = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-variables', projectId] });
      toast({
        title: 'Environment Variable Updated',
        description: 'The environment variable has been updated successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Update Variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEnvironmentVariable(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/projects/${projectId}/environment/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete environment variable');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-variables', projectId] });
      toast({
        title: 'Environment Variable Deleted',
        description: 'The environment variable has been deleted successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Delete Variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}