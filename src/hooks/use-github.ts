'use client';

import { useToast } from '@/hooks/use-toast';
import type { GitHubInfo, GitHubStatusResponse } from '@/lib/types/github';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

async function fetchGitHubStatus(): Promise<GitHubInfo | null> {
  const response = await fetch('/api/auth/github/status');
  console.log(response);
  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to load GitHub information');
  }

  const responseData = await response.json();
  const data: GitHubStatusResponse = responseData.data;

  if (data.connected && data.githubUsername) {
    return {
      githubUsername: data.githubUsername ?? '',
      githubId: data.githubId ?? '',
      connectedAt: data.connectedAt ?? new Date().toISOString(),
    };
  }

  return null;
}

async function disconnectGitHub(): Promise<void> {
  const response = await fetch('/api/auth/github/disconnect', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to disconnect GitHub account');
  }

  await response.json();
}

export function useGitHub() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['github-status'],
    queryFn: fetchGitHubStatus,
    enabled: isLoaded && !!user,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGitHub,
    onMutate: () => setIsDisconnecting(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-status'] });

      toast({
        title: 'GitHub Account Disconnected',
        description: 'You will be redirected to sign in again.',
      });

      setTimeout(() => {
        window.location.href = '/sign-in';
      }, 2000);
    },
    onError: () => {
      toast({
        title: 'Disconnection Failed',
        description: 'Failed to disconnect GitHub account. Please try again.',
        variant: 'destructive',
      });
      setIsDisconnecting(false);
    },
  });

  return {
    githubInfo: data ?? null,
    isLoading,
    isDisconnecting,
    error: error ? String(error) : null,
    disconnectGitHub: () => disconnectMutation.mutate(),
    retry: () => refetch(),
  };
}
