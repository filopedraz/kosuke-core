'use client';

import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useMemo } from 'react';
import { Alert } from 'react-native';

interface ChatSession {
  id: number;
  projectId: number;
  userId: string;
  sessionId: string;
  title: string;
  description?: string;
  status: string;
  messageCount: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

interface GroupedSessions {
  date: string;
  data: ChatSession[];
}

interface UseChatSessionsOptions {
  projectId: number;
  enabled?: boolean;
}

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

function groupSessionsByDate(sessions: ChatSession[]): GroupedSessions[] {
  const groups: { [key: string]: ChatSession[] } = {};

  sessions.forEach(session => {
    const group = getDateGroup(session.lastActivityAt);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(session);
  });

  return Object.entries(groups).map(([date, items]) => ({
    date,
    data: items,
  }));
}

export function useChatSessions({ projectId, enabled = true }: UseChatSessionsOptions) {
  const { getToken, userId } = useAuth();
  const baseUrl = Constants.expoConfig?.extra?.API_BASE_URL || 'https://kosuke.ai/api';

  const query = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions', projectId, userId],
    queryFn: async (): Promise<ChatSession[]> => {
      try {
        if (!userId) {
          throw new Error('User not authenticated');
        }

        if (!projectId) {
          throw new Error('Project ID is required');
        }

        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`${baseUrl}/projects/${projectId}/chat-sessions`, {
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
          if (response.status === 403) {
            throw new Error('Access denied to this project');
          }
          if (response.status === 404) {
            throw new Error('Project not found');
          }
          throw new Error(`Failed to fetch chat sessions: ${response.status}`);
        }

        const data = await response.json();

        // Extract sessions from the response object
        const sessions = data.sessions || [];

        // Transform the data to ensure dates are Date objects
        return sessions.map((session: unknown) => {
          const sessionData = session as Record<string, unknown>;
          return {
            ...sessionData,
            createdAt: new Date(sessionData.createdAt as string),
            updatedAt: new Date(sessionData.updatedAt as string),
            lastActivityAt: new Date(sessionData.lastActivityAt as string),
          } as ChatSession;
        });
      } catch (error) {
        console.error('Failed to fetch chat sessions:', error);
        Alert.alert(
          'Error',
          'Failed to load chat sessions. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
        throw error;
      }
    },
    enabled: enabled && !!userId && !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Group sessions by date
  const processedData = useMemo(() => {
    if (!query.data) return { groupedSessions: [], flatData: [] };

    // Group sessions by date
    const groupedSessions = groupSessionsByDate(query.data);

    // Create flat data with separators for FlatList
    type FlatDataItem = ChatSession | { type: 'separator'; date: string; id: string };
    const flatData: FlatDataItem[] = groupedSessions.reduce((acc: FlatDataItem[], group) => {
      acc.push({ type: 'separator', date: group.date, id: `separator-${group.date}` });
      acc.push(...group.data);
      return acc;
    }, []);

    return { groupedSessions, flatData };
  }, [query.data]);

  return {
    ...query,
    sessions: query.data || [],
    groupedSessions: processedData.groupedSessions,
    flatData: processedData.flatData,
  };
}
