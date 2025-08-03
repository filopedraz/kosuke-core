'use client';

import { useProjectStore, type Project } from '@/lib/stores/projectStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface UseProjectsOptions {
  userId: string;
  initialData?: Project[];
}

export function useProjects({ userId, initialData }: UseProjectsOptions) {
  const { setProjects } = useProjectStore();

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

        // Update the global store
        setProjects(projects);
        return projects;
      } catch (error) {
        console.error('Failed to fetch projects', error);
        // If API fails, fall back to initial data
        return initialData || [];
      }
    },
    placeholderData: initialData,
    staleTime: 1000 * 60, // Consider data stale after 1 minute
    refetchOnWindowFocus: true, // Refetch when window gets focus
    refetchOnMount: true, // Always refetch when component mounts
  });
}

export function useProject(projectId: number) {
  return useQuery<Project, Error>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const { data } = await response.json();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    },
    staleTime: 1000 * 60, // Consider data stale after 1 minute
  });
}

export function useCreateProject() {
  return useMutation<Project, Error, { prompt: string; name: string }>({
    mutationFn: async requestData => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      if (!response.ok) {
        throw new Error('Failed to create project');
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
        throw new Error('Invalid project data received from server');
      }

      return {
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      };
    },
    // onSuccess moved to modal to avoid conflicts - will be handled in modal callback
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { removeProject } = useProjectStore();

  return useMutation<number, Error, number>({
    mutationFn: async projectId => {
      // Allow more time for deletion to complete
      const timeoutDuration = 30000; // 30 seconds

      // Track stages to ensure a proper UX
      console.log('Starting project deletion process...');

      // First, try to delete the project folder with a timeout
      try {
        console.log('Step 1: Deleting project folder...');
        const fileDeletePromise = new Promise<boolean>(async resolve => {
          try {
            const folderResponse = await fetch(`/api/projects/${projectId}/files`, {
              method: 'DELETE',
            });

            if (folderResponse.ok) {
              console.log('File deletion API call succeeded');
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
            console.log('File deletion timed out, proceeding with project deletion');
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

      console.log('Step 2: Deleting project from database...');
      // Always proceed with project deletion even if file deletion failed
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Ensure the operation takes at least minOperationTime for better UX
      const operationTime = Date.now() - startTime;
      if (operationTime < minOperationTime) {
        await new Promise(resolve => setTimeout(resolve, minOperationTime - operationTime));
      }

      console.log('Project deletion completed successfully');
      return projectId;
    },
    onSuccess: projectId => {
      // First update the store
      removeProject(projectId);

      console.log('Project removed from store, invalidating queries...');

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
  const { updateProject } = useProjectStore();

  return useMutation<Project, Error, { projectId: number; updates: Partial<Project> }>({
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
      updateProject(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
}
