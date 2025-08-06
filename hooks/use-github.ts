'use client';

import { useToast } from '@/hooks/use-toast';
import type {
  GitHubAccountState,
  GitHubDisconnectResponse,
  GitHubStatusResponse,
} from '@/lib/types/github';
import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';

export function useGitHub() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();

  const [state, setState] = useState<GitHubAccountState>({
    githubInfo: null,
    isLoading: false,
    isDisconnecting: false,
    error: null,
  });

  const loadGitHubInfo = useCallback(async () => {
    if (!isLoaded || !user) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/github/status');

      if (response.ok) {
        const responseData = await response.json();
        const data: GitHubStatusResponse = responseData.data;

        if (data.connected && data.githubUsername) {
          setState(prev => ({
            ...prev,
            githubInfo: {
              githubUsername: data.githubUsername,
              githubId: data.githubId || '',
              connectedAt: data.connectedAt || new Date().toISOString(),
            },
            isLoading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            githubInfo: null,
            isLoading: false,
          }));
        }
      } else if (response.status === 401) {
        // Handle unauthorized - user session might not be ready yet
        console.warn('User not authenticated, will retry on next effect cycle');
        setState(prev => ({ ...prev, isLoading: false }));
      } else {
        const errorData = await response.json();
        console.error('Failed to load GitHub info:', errorData);
        setState(prev => ({
          ...prev,
          error: 'Failed to load GitHub information',
          isLoading: false,
        }));

        toast({
          title: 'Failed to Load GitHub Info',
          description: 'Please refresh the page to try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading GitHub info:', error);
      setState(prev => ({
        ...prev,
        error: 'Connection error',
        isLoading: false,
      }));

      toast({
        title: 'Connection Error',
        description: 'Failed to connect to the server. Please check your connection.',
        variant: 'destructive',
      });
    }
  }, [isLoaded, user, toast]);

  // Load GitHub info only once when user is loaded
  useEffect(() => {
    if (isLoaded && user && !state.githubInfo && !state.isLoading) {
      loadGitHubInfo();
    }
  }, [isLoaded, user]); // Removed loadGitHubInfo from deps to prevent infinite loop

  const disconnectGitHub = useCallback(async () => {
    setState(prev => ({ ...prev, isDisconnecting: true }));

    try {
      const response = await fetch('/api/auth/github/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        const data: GitHubDisconnectResponse = await response.json();

        toast({
          title: 'GitHub Account Disconnected',
          description: 'You will be redirected to sign in again.',
        });

        // Redirect to sign-in since GitHub is required
        setTimeout(() => {
          window.location.href = '/sign-in';
        }, 2000);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      toast({
        title: 'Disconnection Failed',
        description: 'Failed to disconnect GitHub account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, isDisconnecting: false }));
    }
  }, [toast]);

  const retry = useCallback(() => {
    loadGitHubInfo();
  }, [loadGitHubInfo]);

  return {
    ...state,
    disconnectGitHub,
    retry,
  };
}
