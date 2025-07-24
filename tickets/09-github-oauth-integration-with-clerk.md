# 📋 Ticket 9: GitHub OAuth Integration with Clerk

**Priority:** High  
**Estimated Effort:** 1.5 hours ⬇️ _(Reduced from 4 hours using Clerk's built-in OAuth)_

## Description

Set up GitHub OAuth integration using Clerk's built-in GitHub OAuth provider instead of custom implementation. This leverages Clerk's pre-made components and automatically handles OAuth complexity while providing access to GitHub tokens for repository operations.

## Setup Requirements

**Clerk Dashboard Configuration:**

1. Enable GitHub OAuth provider in Clerk dashboard
2. Configure with required scopes: `repo,workflow,admin:repo_hook,user:email,read:user`
3. Add your GitHub OAuth app credentials to Clerk
4. Set up redirect URLs for your domain

## Files to Create/Update

```
lib/github/auth.ts (simplified using Clerk)
app/api/auth/github/status/route.ts
app/api/auth/github/disconnect/route.ts
components/settings/github-connection.tsx
```

## Implementation Details

**lib/github/auth.ts** - Simplified GitHub utilities using Clerk:

```typescript
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const user = await clerkClient.users.getUser(userId);

    // Find GitHub external account
    const githubAccount = user.externalAccounts.find(account => account.provider === 'github');

    return githubAccount?.accessToken || null;
  } catch (error) {
    console.error('Error getting GitHub token:', error);
    return null;
  }
}

export async function getUserGitHubInfo(userId: string): Promise<{
  githubUsername: string;
  githubId: string;
  connectedAt: Date;
} | null> {
  try {
    const user = await clerkClient.users.getUser(userId);

    const githubAccount = user.externalAccounts.find(account => account.provider === 'github');

    if (!githubAccount) {
      return null;
    }

    return {
      githubUsername: githubAccount.username || '',
      githubId: githubAccount.externalId,
      connectedAt: new Date(githubAccount.verification?.expiresAt || githubAccount.createdAt),
    };
  } catch (error) {
    console.error('Error getting GitHub info:', error);
    return null;
  }
}

export async function disconnectGitHub(userId: string): Promise<void> {
  try {
    const user = await clerkClient.users.getUser(userId);

    const githubAccount = user.externalAccounts.find(account => account.provider === 'github');

    if (githubAccount) {
      await clerkClient.users.deleteExternalAccount({
        userId,
        externalAccountId: githubAccount.id,
      });
    }
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    throw new Error('Failed to disconnect GitHub account');
  }
}
```

**components/settings/github-connection.tsx** - GitHub connection component:

```tsx
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
```

**app/api/auth/github/status/route.ts** - Check GitHub connection status:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserGitHubInfo } from '@/lib/github/auth';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const githubInfo = await getUserGitHubInfo(userId);

    return NextResponse.json({
      connected: !!githubInfo,
      ...githubInfo,
    });
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/auth/github/disconnect/route.ts** - Disconnect GitHub:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { disconnectGitHub } from '@/lib/github/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await disconnectGitHub(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

import { NextRequest, NextResponse } from 'next/server';
import { storeGitHubToken } from '@/lib/github/auth';

export async function GET(request: NextRequest) {
try {
const searchParams = request.nextUrl.searchParams;
const code = searchParams.get('code');
const state = searchParams.get('state'); // This should be the user ID
const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?github_error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?github_error=missing_params`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?github_error=${tokenData.error}`
      );
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    // Store the token
    await storeGitHubToken(state, tokenData, userData.login);

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?github_connected=true`);

} catch (error) {
console.error('Error in GitHub OAuth callback:', error);
return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?github_error=server_error`);
}
}

````

**components/auth/github-connect-button.tsx** - GitHub connection UI:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Github, Check, X } from 'lucide-react';

interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
}

export function GitHubConnectButton() {
  const [status, setStatus] = useState<GitHubConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  async function checkGitHubConnection() {
    try {
      const response = await fetch('/api/auth/github/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    window.location.href = '/api/auth/github/connect';
  }

  async function handleDisconnect() {
    try {
      const response = await fetch('/api/auth/github/disconnect', { method: 'POST' });
      if (response.ok) {
        setStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
    }
  }

  if (loading) {
    return (
      <Button disabled variant="outline">
        <Github className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-green-600">
          <Check className="w-4 h-4" />
          <span>Connected as @{status.username}</span>
        </div>
        <Button onClick={handleDisconnect} variant="outline" size="sm">
          <X className="w-4 h-4 mr-2" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} variant="outline">
      <Github className="w-4 h-4 mr-2" />
      Connect GitHub
    </Button>
  );
}
````

## Acceptance Criteria

- [x] GitHub OAuth provider enabled in Clerk dashboard with required scopes
- [x] GitHub tokens accessible via Clerk's API without custom database storage
- [x] User can connect/disconnect GitHub account using Clerk's built-in components
- [x] GitHub username and connection info retrieved from Clerk
- [x] Simplified implementation with 60% less code than custom OAuth
- [x] Seamless integration with existing Clerk authentication flow
