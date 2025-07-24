# 📋 Ticket 14: GitHub Branch Management & Pull Request UI

**Priority:** High  
**Estimated Effort:** 5 hours

## Description

Add UI components to the project detail view that show the current Git branch, display uncommitted changes, and provide functionality to create pull requests directly from the interface.

## Files to Create/Update

```
app/(logged-in)/projects/[id]/components/github/
├── branch-indicator.tsx
├── changes-panel.tsx
├── pull-request-modal.tsx
├── github-status.tsx
└── skeletons/
    ├── branch-indicator-skeleton.tsx
    └── changes-panel-skeleton.tsx
app/(logged-in)/projects/[id]/page.tsx (update to include GitHub components)
app/api/projects/[id]/github/status/route.ts
app/api/projects/[id]/github/create-pr/route.ts
hooks/use-github-status.ts
hooks/use-create-pull-request.ts
lib/types/github.ts (centralized GitHub types)
agent/app/api/routes/github.py (add branch and PR routes)
agent/app/services/github_service.py (add branch/PR methods)
```

## Implementation Details

**lib/types/github.ts** - Centralized GitHub types:

```typescript
export interface BranchStatus {
  current_branch: string;
  has_uncommitted_changes: boolean;
  commits_ahead: number;
  commits_behind: number;
  last_commit_sha: string;
  last_commit_message: string;
  repository_url?: string;
}

export interface GitHubChanges {
  modified_files: string[];
  added_files: string[];
  deleted_files: string[];
  total_changes: number;
}

export interface CreatePullRequestData {
  title: string;
  body: string;
  head_branch: string;
  base_branch: string;
  draft: boolean;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  created_at: string;
  updated_at: string;
}
```

**hooks/use-github-status.ts** - TanStack Query hook for GitHub status:

```typescript
import { useQuery } from '@tanstack/react-query';
import type { BranchStatus } from '@/lib/types/github';
import type { ApiResponse } from '@/lib/api';

export function useGitHubStatus(projectId: number) {
  return useQuery({
    queryKey: ['github-status', projectId],
    queryFn: async (): Promise<BranchStatus> => {
      const response = await fetch(`/api/projects/${projectId}/github/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub status');
      }
      const data: ApiResponse<BranchStatus> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
```

**hooks/use-create-pull-request.ts** - TanStack Query mutation for PR creation:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { CreatePullRequestData, PullRequest } from '@/lib/types/github';
import type { ApiResponse } from '@/lib/api';

export function useCreatePullRequest(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePullRequestData): Promise<PullRequest> => {
      const response = await fetch(`/api/projects/${projectId}/github/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create pull request');
      }

      const result: ApiResponse<PullRequest> = await response.json();
      return result.data;
    },
    onSuccess: pullRequest => {
      queryClient.invalidateQueries({ queryKey: ['github-status', projectId] });
      toast({
        title: 'Pull Request Created',
        description: `Created PR #${pullRequest.number}: ${pullRequest.title}`,
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Create Pull Request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

**app/(logged-in)/projects/[id]/components/github/skeletons/branch-indicator-skeleton.tsx** - Skeleton component:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function BranchIndicatorSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/github/branch-indicator.tsx** - Branch status component:

```tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, GitPullRequest } from 'lucide-react';
import { PullRequestModal } from './pull-request-modal';
import { BranchIndicatorSkeleton } from './skeletons/branch-indicator-skeleton';
import { useGitHubStatus } from '@/hooks/use-github-status';

interface BranchIndicatorProps {
  projectId: number;
}

export function BranchIndicator({ projectId }: BranchIndicatorProps) {
  const [showPRModal, setShowPRModal] = useState(false);
  const { data: status, isLoading, error } = useGitHubStatus(projectId);

  if (isLoading) {
    return <BranchIndicatorSkeleton />;
  }

  if (error || !status) {
    return <div className="text-sm text-muted-foreground">No Git repository connected</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4" />
        <Badge variant="secondary" className="font-mono">
          {status.current_branch}
        </Badge>
      </div>

      {status.has_uncommitted_changes && (
        <Badge variant="destructive" className="text-xs">
          Uncommitted changes
        </Badge>
      )}

      {status.commits_ahead > 0 && (
        <Badge variant="default" className="text-xs">
          {status.commits_ahead} ahead
        </Badge>
      )}

      {status.commits_behind > 0 && (
        <Badge variant="outline" className="text-xs">
          {status.commits_behind} behind
        </Badge>
      )}

      {status.commits_ahead > 0 && !status.has_uncommitted_changes && (
        <Button onClick={() => setShowPRModal(true)} size="sm" variant="outline" className="ml-2">
          <GitPullRequest className="w-4 h-4 mr-2" />
          Create PR
        </Button>
      )}

      <PullRequestModal
        projectId={projectId}
        isOpen={showPRModal}
        onClose={() => setShowPRModal(false)}
        currentBranch={status.current_branch}
        commitsAhead={status.commits_ahead}
      />
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/github/pull-request-modal.tsx** - PR creation modal:

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GitPullRequest, ExternalLink } from 'lucide-react';

interface PullRequestModalProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  currentBranch: string;
  commitsAhead: number;
}

export function PullRequestModal({
  projectId,
  isOpen,
  onClose,
  currentBranch,
  commitsAhead,
}: PullRequestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ url: string } | null>(null);

  async function handleCreatePR() {
    if (!title.trim()) {
      setError('PR title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/github/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          head: currentBranch,
          base: targetBranch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create pull request');
      }

      const data = await response.json();
      setSuccess({ url: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setTitle('');
      setDescription('');
      setTargetBranch('main');
      setError(null);
      setSuccess(null);
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5" />
            Create Pull Request
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>Pull request created successfully!</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={() => window.open(success.url, '_blank')} className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on GitHub
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">From:</Label>
                <div className="font-mono">{currentBranch}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">To:</Label>
                <Input
                  value={targetBranch}
                  onChange={e => setTargetBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {commitsAhead} commit{commitsAhead !== 1 ? 's' : ''} ahead
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-title">Title *</Label>
              <Input
                id="pr-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Add new feature..."
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-description">Description</Label>
              <Textarea
                id="pr-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the changes in this pull request..."
                rows={3}
                disabled={loading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreatePR}
                disabled={loading || !title.trim()}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Pull Request'}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**app/api/projects/[id]/github/status/route.ts** - GitHub branch status:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGitHubToken } from '@/lib/github/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const githubToken = await getGitHubToken(session.user.id);

    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/github/branch-status/${projectId}`, {
      headers: {
        'X-GitHub-Token': githubToken,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to get branch status', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting GitHub branch status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/github/create-pr/route.ts** - Create pull request:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGitHubToken } from '@/lib/github/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();
    const githubToken = await getGitHubToken(session.user.id);

    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/github/create-pull-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify({
        project_id: projectId,
        ...body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to create pull request', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating pull request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Acceptance Criteria

- [x] Branch indicator showing current branch in project view
- [x] Visual indicators for uncommitted changes and commits ahead/behind
- [x] Pull request creation modal with title/description
- [x] Success state with link to created PR on GitHub
- [x] Error handling for PR creation failures
