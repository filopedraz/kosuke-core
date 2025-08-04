'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Github, Unlink, CheckCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GitHubInfo {
  githubUsername: string;
  githubId: string;
  connectedAt: string;
}

export function GitHubConnection() {
  const { user } = useUser();
  const { toast } = useToast();
  const [githubInfo, setGithubInfo] = useState<GitHubInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkGitHubConnection();
    }
  }, [user]);

  const checkGitHubConnection = async () => {
    try {
      const response = await fetch('/api/auth/github/status');
      if (response.ok) {
        const data = await response.json();
        setGithubInfo(data.connected ? data : null);
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
    }
  };

  const connectGitHub = async () => {
    setIsLoading(true);
    try {
      // Use Clerk's built-in social connection
      await user?.createExternalAccount({
        strategy: 'oauth_github',
        redirectUrl: `${window.location.origin}/settings?success=github_connected`,
      });
    } catch (error) {
      console.error('Error connecting GitHub:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect GitHub account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectGitHub = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/github/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setGithubInfo(null);
        toast({
          title: 'GitHub Disconnected',
          description: 'Your GitHub account has been disconnected successfully.',
        });
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
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Integration
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to create and manage repositories directly from Kosuke.
          Required for repository creation, imports, and auto-commits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {githubInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Connected as @{githubInfo.githubUsername}</span>
                </div>
                <Badge variant="secondary">Connected</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={disconnectGitHub} disabled={isLoading}>
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Connected on {new Date(githubInfo.connectedAt).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">No GitHub account connected</p>
                <p className="text-sm text-muted-foreground">
                  Connect your account to enable repository creation, imports, and auto-commits.
                </p>
              </div>
              <Button onClick={connectGitHub} disabled={isLoading}>
                <Github className="h-4 w-4 mr-2" />
                Connect GitHub
              </Button>
            </div>
            <div className="border-t pt-4">
              <div className="text-sm space-y-2">
                <p className="font-medium">Permissions Required:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Repository access for creating and managing repos</li>
                  <li>Workflow permissions for GitHub Actions</li>
                  <li>Profile information for attribution</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}