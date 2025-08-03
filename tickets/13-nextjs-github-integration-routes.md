# 📋 Ticket 13: Next.js GitHub Integration Routes

**Priority:** Medium
**Estimated Effort:** 3 hours

## Description

Create Next.js API routes to proxy GitHub operations to the Python agent and handle GitHub-related webhooks.

## Files to Create/Update

```
app/api/projects/[id]/github/create-repo/route.ts
app/api/projects/[id]/github/import/route.ts
app/api/projects/[id]/webhook/commit/route.ts
app/api/auth/github/status/route.ts
app/api/auth/github/disconnect/route.ts
hooks/use-github-repositories.ts
hooks/use-github-operations.ts
components/github/skeletons/repository-list-skeleton.tsx
components/github/skeletons/repository-form-skeleton.tsx
lib/types/github.ts (extend existing)
```

## Implementation Details

**lib/types/github.ts** - Extended GitHub types for repositories:

```typescript
// Extend existing github.ts with additional repository types
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRepositoryData {
  name: string;
  description?: string;
  private: boolean;
  auto_init?: boolean;
}

export interface ImportRepositoryData {
  repository_url: string;
  access_token?: string;
}

export interface GitHubWebhookPayload {
  action: string;
  repository: GitHubRepository;
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    modified: string[];
    added: string[];
    removed: string[];
  }>;
}
```

**hooks/use-github-repositories.ts** - TanStack Query hook for GitHub repositories:

```typescript
import { useQuery } from '@tanstack/react-query';
import type { GitHubRepository } from '@/lib/types/github';
import type { ApiResponse } from '@/lib/api';

export function useGitHubRepositories(userId: string) {
  return useQuery({
    queryKey: ['github-repositories', userId],
    queryFn: async (): Promise<GitHubRepository[]> => {
      const response = await fetch(`/api/auth/github/repositories`);
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub repositories');
      }
      const data: ApiResponse<{ repositories: GitHubRepository[] }> = await response.json();
      return data.data.repositories;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!userId,
  });
}

export function useGitHubStatus(userId: string) {
  return useQuery({
    queryKey: ['github-status', userId],
    queryFn: async () => {
      const response = await fetch('/api/auth/github/status');
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub status');
      }
      const data: ApiResponse<{
        connected: boolean;
        githubUsername?: string;
        githubId?: string;
        connectedAt?: string;
      }> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
    enabled: !!userId,
  });
}
```

**hooks/use-github-operations.ts** - TanStack Query mutations for GitHub operations:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  CreateRepositoryData,
  ImportRepositoryData,
  GitHubRepository,
} from '@/lib/types/github';
import type { ApiResponse } from '@/lib/api';

export function useCreateRepository(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRepositoryData): Promise<GitHubRepository> => {
      const response = await fetch(`/api/projects/${projectId}/github/create-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create repository');
      }

      const result: ApiResponse<GitHubRepository> = await response.json();
      return result.data;
    },
    onSuccess: repository => {
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: 'Repository Created',
        description: `Successfully created repository: ${repository.name}`,
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Create Repository',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useImportRepository(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportRepositoryData): Promise<GitHubRepository> => {
      const response = await fetch(`/api/projects/${projectId}/github/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to import repository');
      }

      const result: ApiResponse<GitHubRepository> = await response.json();
      return result.data;
    },
    onSuccess: repository => {
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: 'Repository Imported',
        description: `Successfully imported repository: ${repository.name}`,
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Import Repository',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDisconnectGitHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch('/api/auth/github/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to disconnect GitHub');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github-status'] });
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] });
      toast({
        title: 'GitHub Disconnected',
        description: 'Successfully disconnected your GitHub account.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Disconnect',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

**components/github/skeletons/repository-list-skeleton.tsx** - Skeleton for repository lists:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function RepositoryListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**components/github/skeletons/repository-form-skeleton.tsx** - Skeleton for repository forms:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function RepositoryFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>

        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
```

**app/api/projects/[id]/github/create-repo/route.ts** - Create GitHub repo:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGitHubToken } from '@/lib/github/auth';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    // Get user's GitHub token
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/github/create-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to create repository', details: error },
        { status: response.status }
      );
    }

    const repoData = await response.json();

    // Update project with GitHub info
    await db
      .update(projects)
      .set({
        githubRepoUrl: repoData.url,
        githubOwner: repoData.owner,
        githubRepoName: repoData.name,
        lastGithubSync: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json(repoData);
  } catch (error) {
    console.error('Error creating GitHub repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/github/import/route.ts** - Import GitHub repo:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGitHubToken } from '@/lib/github/auth';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const { repo_url } = await request.json();

    // Get user's GitHub token
    const githubToken = await getGitHubToken(userId);
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // First get repo info
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const infoResponse = await fetch(
      `${agentUrl}/api/github/repo-info?repo_url=${encodeURIComponent(repo_url)}`,
      {
        headers: {
          'X-GitHub-Token': githubToken,
        },
      }
    );

    if (!infoResponse.ok) {
      return NextResponse.json({ error: 'Invalid repository URL' }, { status: 400 });
    }

    const repoInfo = await infoResponse.json();

    // Import repository
    const importResponse = await fetch(`${agentUrl}/api/github/import-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify({
        repo_url,
        project_id: projectId,
      }),
    });

    if (!importResponse.ok) {
      const error = await importResponse.text();
      return NextResponse.json(
        { error: 'Failed to import repository', details: error },
        { status: importResponse.status }
      );
    }

    // Update project with GitHub info
    await db
      .update(projects)
      .set({
        githubRepoUrl: repo_url,
        githubOwner: repoInfo.owner,
        githubRepoName: repoInfo.name,
        lastGithubSync: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({ success: true, repo_info: repoInfo });
  } catch (error) {
    console.error('Error importing GitHub repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/webhook/commit/route.ts** - Handle commit webhooks:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectCommits } from '@/lib/db/schema';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    // Save commit info to database
    await db.insert(projectCommits).values({
      projectId,
      commitSha: body.commit_sha,
      commitMessage: body.commit_message,
      filesChanged: body.files_changed,
      commitUrl: body.commit_url || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling commit webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/auth/github/status/route.ts** - GitHub connection status:

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
      username: githubInfo?.githubUsername || null,
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

## Acceptance Criteria

- [x] GitHub repository operations available via Next.js API
- [x] Project-GitHub linking in database
- [x] Commit webhook handling
- [x] GitHub connection management routes

## 🎯 Summary

This comprehensive plan covers:

**Phase 1: Infrastructure & Preview Migration (Tickets 1-7)**

- Rename agent endpoints folder to routes (consistency)
- Set up Python testing infrastructure (pytest, ruff, mypy)
- Set up pre-commit hooks for code quality
- Move Docker container management from Next.js to Python agent
- Create clean API proxy layer in Next.js
- Remove old preview logic

**Phase 2: GitHub Integration (Tickets 8-13)**

- OAuth integration with Clerk
- Repository creation and import
- Auto-commit with session-based checkpoints
- Complete webhook integration

**Total Estimated Effort:** ~30 hours

**Benefits:**
✅ Lean Next.js focused on frontend
✅ Centralized agent handling all operations
✅ Modern GitHub workflow like Vercel
✅ Automatic change tracking and commits
✅ Clean separation of concerns
