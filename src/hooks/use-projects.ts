'use client';

import type { Project } from '@/lib/db/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface UseProjectsOptions {
  userId: string;
  initialData?: Project[];
}

export function useProjects({ userId, initialData }: UseProjectsOptions) {
  return useQuery<Project[]>({
    queryKey: ['projects', userId],
    queryFn: async () => {
      try {
        // Make the API call (userId is obtained from auth on server side)
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        // The data is returned directly as an array, not as { projects: [] }
        const projects = await response.json();
        return projects;
      } catch (error) {
        console.error('Failed to fetch projects', error);
        // If API fails, fall back to initial data
        return initialData || [];
      }
    },
    placeholderData: initialData,
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce glitches
    refetchOnMount: false, // Don't always refetch on mount - let staleTime control this
    enabled: !!userId,
  });
}

export function useProject(projectId: string) {
  return useQuery<Project, Error>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('useProject: Failed to fetch project:', errorText);
        throw new Error(`Failed to fetch project: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      const { data } = responseData;

      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    },
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<
    Project,
    Error,
    { prompt: string; name: string } | import('@/lib/types/project').CreateProjectData
  >({
    mutationFn: async requestData => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create project');
      }

      const responseData = await response.json();

      // Handle different response structures
      let project;
      if (responseData.data) {
        // Standard API response format: { data: { project: {...} } }
        project = responseData.data.project || responseData.data;
      } else {
        // Direct response format
        project = responseData.project || responseData;
      }

      // Validate project data
      if (!project || !project.id) {
        console.error('Invalid project data:', { project, responseData });
        throw new Error('Invalid project data received from server');
      }

      return {
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      };
    },
    onSuccess: data => {
      // Invalidate projects list to refresh the cache
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] });

      // Navigate to the project detail page
      const targetUrl = `/projects/${data.id}`;

      // Small delay to ensure any UI updates complete
      setTimeout(() => {
        router.replace(targetUrl);
      }, 100);
    },
    onError: error => {
      console.error('Failed to create project:', error);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string | { projectId: string; deleteRepo?: boolean }>({
    mutationFn: async input => {
      const { projectId, deleteRepo } =
        typeof input === 'string' ? { projectId: input, deleteRepo: false } : input;
      // Allow more time for deletion to complete
      const timeoutDuration = 30000; // 30 seconds

      // First, try to delete the project folder with a timeout
      try {
        const fileDeletePromise = new Promise<boolean>(async resolve => {
          try {
            const folderResponse = await fetch(`/api/projects/${projectId}/files`, {
              method: 'DELETE',
            });

            if (folderResponse.ok) {
              resolve(true);
            } else {
              console.error('Error from file deletion API:', await folderResponse.text());
              resolve(false);
            }
          } catch (error) {
            console.error('Error calling file deletion API:', error);
            resolve(false);
          }
        });

        // Add a timeout to ensure we don't wait indefinitely
        const timeoutPromise = new Promise<boolean>(resolve => {
          setTimeout(() => {
            resolve(false);
          }, timeoutDuration);
        });

        // Use Promise.race to either get the result or timeout
        await Promise.race([fileDeletePromise, timeoutPromise]);
      } catch (error) {
        console.error('Error during file deletion process:', error);
      }

      // Ensure at least 2 seconds pass for UI feedback on faster operations
      const startTime = Date.now();
      const minOperationTime = 2000; // 2 seconds minimum operation time

      // Always proceed with project deletion even if file deletion failed
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteRepo: Boolean(deleteRepo) }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Ensure the operation takes at least minOperationTime for better UX
      const operationTime = Date.now() - startTime;
      if (operationTime < minOperationTime) {
        await new Promise(resolve => setTimeout(resolve, minOperationTime - operationTime));
      }

      return projectId;
    },
    onSuccess: projectId => {
      // Invalidate all relevant queries with proper scope
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        // Force a refetch right away
        refetchType: 'active',
      });

      // Invalidate specific project-related queries
      queryClient.invalidateQueries({
        queryKey: ['files', projectId],
      });

      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });

      // Give the UI time to update before refetching
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ['projects'],
        });
      }, 300);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, { projectId: string; updates: Partial<Project> }>({
    mutationFn: async ({ projectId, updates }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update project');
      }
      const project = await response.json();
      return {
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
}
