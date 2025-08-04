'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGitHub } from '@/hooks/use-github';
import type { GitHubScope } from '@/lib/types/github';
import { CheckCircle, Clock, ExternalLink, Github, Shield, Unlink } from 'lucide-react';

const GITHUB_SCOPES: GitHubScope[] = [
  { name: 'Repository Access', description: 'Create, read, and manage repositories', icon: '📁' },
  { name: 'Workflow Management', description: 'Manage GitHub Actions and CI/CD', icon: '⚙️' },
  { name: 'Webhook Access', description: 'Create and manage repository webhooks', icon: '🔗' },
  { name: 'Profile Information', description: 'Access your GitHub profile and email', icon: '👤' },
];

export default function GitHubSettingsPage() {
  const { githubInfo, isLoading, isDisconnecting, error, disconnectGitHub, retry } = useGitHub();

  // Loading skeleton
  if (isLoading || !githubInfo) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Account
            </CardTitle>
            <CardDescription>Your GitHub account is connected and ready to use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-destructive">{error}</p>
                <Button onClick={retry} variant="outline" size="sm">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Account
          </CardTitle>
          <CardDescription>
            Your GitHub account is connected and ready to use with Kosuke.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">@{githubInfo.githubUsername}</span>
                </div>
                <Badge
                  variant="secondary"
                  className="text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectGitHub}
                disabled={isDisconnecting}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4 mr-2" />
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Connected on {new Date(githubInfo.connectedAt).toLocaleDateString()}
            </div>

            <div className="pt-2">
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`https://github.com/${githubInfo.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View GitHub Profile
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions & Access
          </CardTitle>
          <CardDescription>
            Your GitHub account has granted the following permissions to Kosuke.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {GITHUB_SCOPES.map((scope, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
              >
                <div className="text-lg">{scope.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{scope.name}</span>
                    <Badge
                      variant="outline"
                      className="text-xs text-green-700 border-green-300 dark:text-green-300 dark:border-green-700"
                    >
                      ✓ Granted
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{scope.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 dark:text-amber-400">⚠️</div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  GitHub Account Required
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Disconnecting your GitHub account will sign you out of Kosuke, as GitHub
                  authentication is required to use the platform.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
