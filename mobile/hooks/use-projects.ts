'use client';

import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useMemo } from 'react';
import { Alert } from 'react-native';
import type { FlatProjectData, GroupedProjects, Project, UseProjectsOptions } from '../types';

function getDateGroup(date: Date): string {
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 14) {
    return '1 week ago';
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} weeks ago`;
  } else {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
}

function groupProjectsByDate(projects: Project[]): GroupedProjects[] {
  const groups: { [key: string]: Project[] } = {};

  projects.forEach(project => {
    const group = getDateGroup(project.updatedAt);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(project);
  });

  return Object.entries(groups).map(([date, items]) => ({
    date,
    data: items,
  }));
}

export function useProjects({ searchText = '', enabled = true }: UseProjectsOptions = {}) {
  const { getToken, userId } = useAuth();
  const baseUrl = Constants.expoConfig?.extra?.API_BASE_URL || 'https://kosuke.ai/api';

  const query = useQuery<Project[]>({
    queryKey: ['projects', userId],
    queryFn: async (): Promise<Project[]> => {
      try {
        if (!userId) {
          throw new Error('User not authenticated');
        }

        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${baseUrl}/projects`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed');
          }
          throw new Error(`Failed to fetch projects: ${response.status}`);
        }

        const data = await response.json();

        // Transform the data to ensure dates are Date objects
        return data.map((project: any) => ({
          ...project,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
        }));
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        Alert.alert(
          'Error',
          'Failed to load projects. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
        throw error;
      }
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Filter and group projects
  const processedData = useMemo(() => {
    if (!query.data) return { filteredProjects: [], groupedProjects: [], flatData: [] };

    // Filter projects based on search text
    const filteredProjects = query.data.filter(
      project =>
        project.name.toLowerCase().includes(searchText.toLowerCase()) ||
        project.description.toLowerCase().includes(searchText.toLowerCase())
    );

    // Group filtered projects by date
    const groupedProjects = groupProjectsByDate(filteredProjects);

    // Create flat data with separators for FlatList
    const flatData: FlatProjectData[] = groupedProjects.reduce((acc: FlatProjectData[], group) => {
      acc.push({ type: 'separator', date: group.date, id: `separator-${group.date}` });
      acc.push(...group.data);
      return acc;
    }, []);

    return { filteredProjects, groupedProjects, flatData };
  }, [query.data, searchText]);

  return {
    ...query,
    projects: query.data || [],
    filteredProjects: processedData.filteredProjects,
    groupedProjects: processedData.groupedProjects,
    flatData: processedData.flatData,
  };
}

export function useProject(projectId: number) {
  const { getToken, userId } = useAuth();
  const baseUrl = Constants.expoConfig?.extra?.API_BASE_URL || 'https://kosuke.ai/api';

  return useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: async (): Promise<Project> => {
      try {
        if (!userId) {
          throw new Error('User not authenticated');
        }

        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${baseUrl}/projects/${projectId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Project not found');
          }
          if (response.status === 401) {
            throw new Error('Authentication failed');
          }
          throw new Error(`Failed to fetch project: ${response.status}`);
        }

        const responseData = await response.json();

        // Handle different response formats
        let projectData;
        if (responseData.data) {
          // Wrapped response format: { data: { project data } }
          projectData = responseData.data;
        } else {
          // Direct response format
          projectData = responseData;
        }

        return {
          ...projectData,
          createdAt: new Date(projectData.createdAt),
          updatedAt: new Date(projectData.updatedAt),
        };
      } catch (error) {
        console.error('Failed to fetch project:', error);
        Alert.alert(
          'Error',
          'Failed to load project. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
        throw error;
      }
    },
    enabled: !!userId && !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
