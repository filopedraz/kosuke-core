'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjectStore, type Project } from '@/lib/stores/projectStore';

interface UseProjectsOptions {
  userId: number;
  initialData?: Project[];
}

export function useProjects({ userId, initialData }: UseProjectsOptions) {
  const { setProjects } = useProjectStore();

  return useQuery<Project[]>({
    queryKey: ['projects', userId],
    queryFn: async () => {
      try {
        // Make the API call
        const response = await fetch(`/api/projects?userId=${userId}`);
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
  const queryClient = useQueryClient();
  const { addProject } = useProjectStore();

  return useMutation<Project, Error, { prompt: string; name: string }>({
    mutationFn: async data => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      const project = await response.json();
      return {
        ...project,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      };
    },
    onSuccess: data => {
      addProject(data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { removeProject } = useProjectStore();

  return useMutation<number, Error, number>({
    mutationFn: async projectId => {
      // Allow more time for deletion to complete
      const timeoutDuration = 30000; // 30 seconds
      let fileDeleteSucceeded = false;

      // First, try to delete the project folder with a timeout
      try {
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
        fileDeleteSucceeded = await Promise.race([fileDeletePromise, timeoutPromise]);
      } catch (error) {
        console.error('Error during file deletion process:', error);
      }

      // Now try a second time if the first attempt failed
      if (!fileDeleteSucceeded) {
        console.log('First file deletion attempt failed, trying again after delay');

        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const folderResponse = await fetch(`/api/projects/${projectId}/files`, {
            method: 'DELETE',
          });

          if (!folderResponse.ok) {
            console.warn('Second file deletion attempt also failed:', await folderResponse.text());
          }
        } catch (retryError) {
          console.error('Error during retry of file deletion:', retryError);
        }
      }

      // Always proceed with project deletion even if file deletion failed
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      return projectId;
    },
    onSuccess: projectId => {
      // First update the store
      removeProject(projectId);

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
