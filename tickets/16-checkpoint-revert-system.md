# 📋 Ticket 16: Checkpoint Revert System

**Priority:** High  
**Estimated Effort:** 6 hours

## Description

Implement a checkpoint/revert system that allows users to view all previous AI sessions (checkpoints) and revert the project to any previous state. Each AI session creates a checkpoint, and users can roll back through the chat interface.

## Files to Create/Update

```
app/(logged-in)/projects/[id]/components/chat/
├── checkpoint-panel.tsx
├── checkpoint-modal.tsx
├── revert-confirmation.tsx
└── skeletons/
    ├── checkpoint-panel-skeleton.tsx
    ├── checkpoint-list-skeleton.tsx
    └── checkpoint-card-skeleton.tsx
app/(logged-in)/projects/[id]/components/layout/project-content.tsx (update)
app/api/projects/[id]/checkpoints/route.ts
app/api/projects/[id]/revert/route.ts
hooks/use-checkpoints.ts
hooks/use-checkpoint-operations.ts
lib/types/checkpoints.ts (centralized checkpoint types)
agent/app/api/routes/checkpoints.py
agent/app/services/checkpoint_service.py
agent/app/models/checkpoint.py
lib/db/schema.ts (add checkpoint tables)
```

## Implementation Details

**lib/types/checkpoints.ts** - Centralized checkpoint types:

```typescript
export interface ProjectCheckpoint {
  id: number;
  project_id: number;
  session_id: string;
  checkpoint_name: string | null;
  description: string | null;
  files_snapshot: string[]; // Array of file paths
  commit_sha: string | null;
  created_at: string;
  created_by: string;
  file_count: number;
  size_bytes: number;
}

export interface CheckpointFile {
  id: number;
  checkpoint_id: number;
  file_path: string;
  file_content: string;
  file_type: string;
  created_at: string;
}

export interface CreateCheckpointData {
  session_id: string;
  checkpoint_name?: string;
  description?: string;
  files_to_backup: string[];
}

export interface RevertToCheckpointData {
  checkpoint_id: number;
  create_backup: boolean;
  backup_name?: string;
}

export interface CheckpointComparison {
  added_files: string[];
  modified_files: string[];
  deleted_files: string[];
  total_changes: number;
}

export interface CheckpointStats {
  total_checkpoints: number;
  total_size_bytes: number;
  oldest_checkpoint: string;
  newest_checkpoint: string;
}
```

**hooks/use-checkpoints.ts** - TanStack Query hook for checkpoints:

```typescript
import { useQuery } from '@tanstack/react-query';
import type { ProjectCheckpoint, CheckpointStats } from '@/lib/types/checkpoints';
import type { ApiResponse } from '@/lib/api';

export function useCheckpoints(projectId: number) {
  return useQuery({
    queryKey: ['checkpoints', projectId],
    queryFn: async (): Promise<ProjectCheckpoint[]> => {
      const response = await fetch(`/api/projects/${projectId}/checkpoints`);
      if (!response.ok) {
        throw new Error('Failed to fetch checkpoints');
      }
      const data: ApiResponse<{ checkpoints: ProjectCheckpoint[] }> = await response.json();
      return data.data.checkpoints;
    },
    staleTime: 1000 * 30, // 30 seconds (frequently updated)
    retry: 2,
  });
}

export function useCheckpointStats(projectId: number) {
  return useQuery({
    queryKey: ['checkpoint-stats', projectId],
    queryFn: async (): Promise<CheckpointStats> => {
      const response = await fetch(`/api/projects/${projectId}/checkpoints/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch checkpoint stats');
      }
      const data: ApiResponse<CheckpointStats> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useCheckpointDetails(checkpointId: number | null) {
  return useQuery({
    queryKey: ['checkpoint-details', checkpointId],
    queryFn: async (): Promise<ProjectCheckpoint> => {
      if (!checkpointId) throw new Error('No checkpoint ID provided');

      const response = await fetch(`/api/checkpoints/${checkpointId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch checkpoint details');
      }
      const data: ApiResponse<ProjectCheckpoint> = await response.json();
      return data.data;
    },
    enabled: !!checkpointId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
}
```

**hooks/use-checkpoint-operations.ts** - TanStack Query mutations for checkpoint operations:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  CreateCheckpointData,
  RevertToCheckpointData,
  ProjectCheckpoint,
} from '@/lib/types/checkpoints';
import type { ApiResponse } from '@/lib/api';

export function useCreateCheckpoint(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCheckpointData): Promise<ProjectCheckpoint> => {
      const response = await fetch(`/api/projects/${projectId}/checkpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create checkpoint');
      }

      const result: ApiResponse<ProjectCheckpoint> = await response.json();
      return result.data;
    },
    onSuccess: checkpoint => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['checkpoint-stats', projectId] });
      toast({
        title: 'Checkpoint Created',
        description: `Created checkpoint: ${checkpoint.checkpoint_name || 'Unnamed'}`,
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Create Checkpoint',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRevertToCheckpoint(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RevertToCheckpointData): Promise<void> => {
      const response = await fetch(
        `/api/projects/${projectId}/checkpoints/${data.checkpoint_id}/revert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to revert to checkpoint');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({
        title: 'Checkpoint Restored',
        description: 'Successfully reverted to the selected checkpoint.',
      });
    },
    onError: error => {
      toast({
        title: 'Revert Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCheckpoint(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkpointId: number): Promise<void> => {
      const response = await fetch(`/api/projects/${projectId}/checkpoints/${checkpointId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete checkpoint');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['checkpoint-stats', projectId] });
      toast({
        title: 'Checkpoint Deleted',
        description: 'The checkpoint has been deleted successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Delete Checkpoint',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

**app/(logged-in)/projects/[id]/components/chat/skeletons/checkpoint-panel-skeleton.tsx** - Skeleton for checkpoint panel:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CheckpointPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center space-y-1">
            <Skeleton className="h-6 w-8 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
          <div className="text-center space-y-1">
            <Skeleton className="h-6 w-12 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
          <div className="text-center space-y-1">
            <Skeleton className="h-6 w-10 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**app/(logged-in)/projects/[id]/components/chat/skeletons/checkpoint-list-skeleton.tsx** - Skeleton for checkpoint list:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function CheckpointListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/chat/skeletons/checkpoint-card-skeleton.tsx** - Skeleton for individual checkpoint card:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CheckpointCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**lib/db/schema.ts** - Add checkpoint tracking:

```typescript
// Add to existing schema
export const projectCheckpoints = pgTable('project_checkpoints', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  checkpointName: text('checkpoint_name'),
  description: text('description'),
  filesSnapshot: text('files_snapshot'), // JSON array of file paths at this checkpoint
  commitSha: text('commit_sha'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: text('created_by').notNull(), // user ID
});

export const projectCheckpointFiles = pgTable('project_checkpoint_files', {
  id: serial('id').primaryKey(),
  checkpointId: integer('checkpoint_id')
    .notNull()
    .references(() => projectCheckpoints.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  fileContent: text('file_content').notNull(),
  fileHash: text('file_hash').notNull(),
});
```

**app/(logged-in)/projects/[id]/components/chat/checkpoint-panel.tsx** - Checkpoint UI:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, Clock, GitCommit } from 'lucide-react';
import { CheckpointModal } from './checkpoint-modal';
import { RevertConfirmation } from './revert-confirmation';
import { formatDistanceToNow } from 'date-fns';

interface Checkpoint {
  id: number;
  session_id: string;
  checkpoint_name: string;
  description: string;
  commit_sha?: string;
  created_at: string;
  files_count: number;
  is_current: boolean;
}

interface CheckpointPanelProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CheckpointPanel({ projectId, isOpen, onClose }: CheckpointPanelProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [showRevertModal, setShowRevertModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCheckpoints();
    }
  }, [isOpen, projectId]);

  async function fetchCheckpoints() {
    try {
      const response = await fetch(`/api/projects/${projectId}/checkpoints`);
      if (response.ok) {
        const data = await response.json();
        setCheckpoints(data.checkpoints);
      }
    } catch (error) {
      console.error('Error fetching checkpoints:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleRevert(checkpoint: Checkpoint) {
    setSelectedCheckpoint(checkpoint);
    setShowRevertModal(true);
  }

  async function confirmRevert() {
    if (!selectedCheckpoint) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpoint_id: selectedCheckpoint.id,
          session_id: selectedCheckpoint.session_id,
        }),
      });

      if (response.ok) {
        // Refresh checkpoints and close modals
        await fetchCheckpoints();
        setShowRevertModal(false);
        setSelectedCheckpoint(null);
        // Optionally trigger a page refresh or emit event
        window.location.reload();
      }
    } catch (error) {
      console.error('Error reverting to checkpoint:', error);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <h3 className="font-semibold">Checkpoints</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      <ScrollArea className="h-full p-4">
        {loading ? (
          <div className="text-center text-muted-foreground">Loading checkpoints...</div>
        ) : checkpoints.length === 0 ? (
          <div className="text-center text-muted-foreground">No checkpoints yet</div>
        ) : (
          <div className="space-y-3">
            {checkpoints.map(checkpoint => (
              <div
                key={checkpoint.id}
                className={`p-3 rounded-lg border ${
                  checkpoint.is_current
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">
                      {checkpoint.checkpoint_name || 'Unnamed Session'}
                    </h4>
                    {checkpoint.description && (
                      <p className="text-sm text-muted-foreground mt-1">{checkpoint.description}</p>
                    )}
                  </div>
                  {checkpoint.is_current && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(checkpoint.created_at), { addSuffix: true })}
                  </div>
                  <div>{checkpoint.files_count} files</div>
                  {checkpoint.commit_sha && (
                    <div className="flex items-center gap-1">
                      <GitCommit className="w-3 h-3" />
                      {checkpoint.commit_sha.slice(0, 7)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCheckpoint(checkpoint)}
                  >
                    View Details
                  </Button>
                  {!checkpoint.is_current && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevert(checkpoint)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Revert
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <CheckpointModal
        checkpoint={selectedCheckpoint}
        isOpen={!!selectedCheckpoint && !showRevertModal}
        onClose={() => setSelectedCheckpoint(null)}
      />

      <RevertConfirmation
        checkpoint={selectedCheckpoint}
        isOpen={showRevertModal}
        onConfirm={confirmRevert}
        onCancel={() => {
          setShowRevertModal(false);
          setSelectedCheckpoint(null);
        }}
      />
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/chat/revert-confirmation.tsx** - Revert confirmation:

```tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Checkpoint {
  id: number;
  checkpoint_name: string;
  description: string;
  created_at: string;
  files_count: number;
}

interface RevertConfirmationProps {
  checkpoint: Checkpoint | null;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RevertConfirmation({
  checkpoint,
  isOpen,
  onConfirm,
  onCancel,
}: RevertConfirmationProps) {
  if (!checkpoint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Revert to Checkpoint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action will permanently overwrite your current project state with the selected
              checkpoint. All changes made after this checkpoint will be lost.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Checkpoint Details:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>
                <strong>Name:</strong> {checkpoint.checkpoint_name || 'Unnamed Session'}
              </div>
              <div>
                <strong>Created:</strong> {new Date(checkpoint.created_at).toLocaleString()}
              </div>
              <div>
                <strong>Files:</strong> {checkpoint.files_count} files
              </div>
              {checkpoint.description && (
                <div>
                  <strong>Description:</strong> {checkpoint.description}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**app/api/projects/[id]/checkpoints/route.ts** - Checkpoint API:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectCheckpoints } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);

    // Get all checkpoints for this project
    const checkpoints = await db
      .select()
      .from(projectCheckpoints)
      .where(eq(projectCheckpoints.projectId, projectId))
      .orderBy(desc(projectCheckpoints.createdAt));

    // Mark the most recent as current
    const checkpointsWithStatus = checkpoints.map((checkpoint, index) => ({
      ...checkpoint,
      is_current: index === 0,
      files_count: JSON.parse(checkpoint.filesSnapshot || '[]').length,
    }));

    return NextResponse.json({ checkpoints: checkpointsWithStatus });
  } catch (error) {
    console.error('Error fetching checkpoints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/revert/route.ts** - Revert functionality:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    // Proxy to Python agent for revert operation
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/checkpoints/revert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        checkpoint_id: body.checkpoint_id,
        session_id: body.session_id,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to revert to checkpoint', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reverting to checkpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Test Cases

\***\*tests**/hooks/use-checkpoints.test.ts\*\* - Tests for checkpoint query hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useCheckpoints, useCheckpointStats, useCheckpointDetails } from '@/hooks/use-checkpoints';
import type { ProjectCheckpoint, CheckpointStats } from '@/lib/types/checkpoints';

// Mock fetch globally
global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockCheckpoints: ProjectCheckpoint[] = [
  {
    id: 1,
    project_id: 123,
    session_id: 'session-1',
    checkpoint_name: 'Initial Setup',
    description: 'First checkpoint',
    files_snapshot: ['package.json', 'src/index.ts'],
    commit_sha: 'abc123',
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    file_count: 2,
    size_bytes: 1024,
  },
  {
    id: 2,
    project_id: 123,
    session_id: 'session-2',
    checkpoint_name: 'Added Components',
    description: 'Added React components',
    files_snapshot: ['package.json', 'src/index.ts', 'src/components/Button.tsx'],
    commit_sha: 'def456',
    created_at: '2024-01-02T00:00:00Z',
    created_by: 'user-1',
    file_count: 3,
    size_bytes: 2048,
  },
];

const mockCheckpointStats: CheckpointStats = {
  total_checkpoints: 5,
  total_size_bytes: 10240,
  oldest_checkpoint: '2024-01-01T00:00:00Z',
  newest_checkpoint: '2024-01-05T00:00:00Z',
};

describe('useCheckpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches checkpoints successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { checkpoints: mockCheckpoints },
      }),
    });

    const { result } = renderHook(() => useCheckpoints(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCheckpoints);
    expect(fetch).toHaveBeenCalledWith('/api/projects/123/checkpoints');
  });

  it('handles fetch error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCheckpoints(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to fetch checkpoints'));
  });

  it('handles network error', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCheckpoints(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Network error'));
  });

  it('uses correct query key and stale time', () => {
    const { result } = renderHook(() => useCheckpoints(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.dataUpdatedAt).toBeDefined();
    // Query should be configured with staleTime of 30 seconds
  });
});

describe('useCheckpointStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches checkpoint stats successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCheckpointStats,
      }),
    });

    const { result } = renderHook(() => useCheckpointStats(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCheckpointStats);
    expect(fetch).toHaveBeenCalledWith('/api/projects/123/checkpoints/stats');
  });

  it('handles stats fetch error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useCheckpointStats(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to fetch checkpoint stats'));
  });
});

describe('useCheckpointDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches checkpoint details when ID provided', async () => {
    const mockCheckpoint = mockCheckpoints[0];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCheckpoint,
      }),
    });

    const { result } = renderHook(() => useCheckpointDetails(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCheckpoint);
    expect(fetch).toHaveBeenCalledWith('/api/checkpoints/1');
  });

  it('does not fetch when ID is null', () => {
    const { result } = renderHook(() => useCheckpointDetails(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles checkpoint details fetch error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useCheckpointDetails(999), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to fetch checkpoint details'));
  });

  it('handles missing checkpoint ID error', async () => {
    (fetch as jest.Mock).mockImplementationOnce(() => {
      throw new Error('No checkpoint ID provided');
    });

    const { result } = renderHook(() => useCheckpointDetails(0), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

\***\*tests**/hooks/use-checkpoint-operations.test.ts\*\* - Tests for checkpoint mutation hooks:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useCreateCheckpoint,
  useRevertToCheckpoint,
  useDeleteCheckpoint,
} from '@/hooks/use-checkpoint-operations';
import type {
  CreateCheckpointData,
  RevertToCheckpointData,
  ProjectCheckpoint,
} from '@/lib/types/checkpoints';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockCheckpoint: ProjectCheckpoint = {
  id: 1,
  project_id: 123,
  session_id: 'session-1',
  checkpoint_name: 'Test Checkpoint',
  description: 'Test description',
  files_snapshot: ['package.json', 'src/index.ts'],
  commit_sha: 'abc123',
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  file_count: 2,
  size_bytes: 1024,
};

describe('useCreateCheckpoint', () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/hooks/use-toast').useToast.mockReturnValue({ toast: mockToast });
  });

  it('creates checkpoint successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCheckpoint,
      }),
    });

    const { result } = renderHook(() => useCreateCheckpoint(123), {
      wrapper: createWrapper(),
    });

    const createData: CreateCheckpointData = {
      session_id: 'session-1',
      checkpoint_name: 'Test Checkpoint',
      description: 'Test description',
      files_to_backup: ['package.json', 'src/index.ts'],
    };

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(fetch).toHaveBeenCalledWith('/api/projects/123/checkpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Checkpoint Created',
      description: 'Created checkpoint: Test Checkpoint',
    });
  });

  it('handles create checkpoint error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Failed to create checkpoint',
    });

    const { result } = renderHook(() => useCreateCheckpoint(123), {
      wrapper: createWrapper(),
    });

    const createData: CreateCheckpointData = {
      session_id: 'session-1',
      files_to_backup: ['package.json'],
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(createData);
      } catch (error) {
        expect(error).toEqual(new Error('Failed to create checkpoint'));
      }
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Failed to Create Checkpoint',
      description: 'Failed to create checkpoint',
      variant: 'destructive',
    });
  });

  it('handles network error during create', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCreateCheckpoint(123), {
      wrapper: createWrapper(),
    });

    const createData: CreateCheckpointData = {
      session_id: 'session-1',
      files_to_backup: ['package.json'],
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(createData);
      } catch (error) {
        expect(error).toEqual(new Error('Network error'));
      }
    });
  });

  it('creates checkpoint with unnamed session', async () => {
    const unnamedCheckpoint = { ...mockCheckpoint, checkpoint_name: null };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: unnamedCheckpoint,
      }),
    });

    const { result } = renderHook(() => useCreateCheckpoint(123), {
      wrapper: createWrapper(),
    });

    const createData: CreateCheckpointData = {
      session_id: 'session-1',
      files_to_backup: ['package.json'],
    };

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Checkpoint Created',
      description: 'Created checkpoint: Unnamed',
    });
  });
});

describe('useRevertToCheckpoint', () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/hooks/use-toast').useToast.mockReturnValue({ toast: mockToast });
  });

  it('reverts to checkpoint successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useRevertToCheckpoint(123), {
      wrapper: createWrapper(),
    });

    const revertData: RevertToCheckpointData = {
      checkpoint_id: 1,
      create_backup: true,
      backup_name: 'Pre-revert backup',
    };

    await act(async () => {
      await result.current.mutateAsync(revertData);
    });

    expect(fetch).toHaveBeenCalledWith('/api/projects/123/checkpoints/1/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(revertData),
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Checkpoint Restored',
      description: 'Successfully reverted to the selected checkpoint.',
    });
  });

  it('handles revert error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Revert failed',
    });

    const { result } = renderHook(() => useRevertToCheckpoint(123), {
      wrapper: createWrapper(),
    });

    const revertData: RevertToCheckpointData = {
      checkpoint_id: 1,
      create_backup: false,
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(revertData);
      } catch (error) {
        expect(error).toEqual(new Error('Failed to revert to checkpoint'));
      }
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Revert Failed',
      description: 'Failed to revert to checkpoint',
      variant: 'destructive',
    });
  });
});

describe('useDeleteCheckpoint', () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/hooks/use-toast').useToast.mockReturnValue({ toast: mockToast });
  });

  it('deletes checkpoint successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    });

    const { result } = renderHook(() => useDeleteCheckpoint(123), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(fetch).toHaveBeenCalledWith('/api/projects/123/checkpoints/1', {
      method: 'DELETE',
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Checkpoint Deleted',
      description: 'The checkpoint has been deleted successfully.',
    });
  });

  it('handles delete error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Delete failed',
    });

    const { result } = renderHook(() => useDeleteCheckpoint(123), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync(1);
      } catch (error) {
        expect(error).toEqual(new Error('Delete failed'));
      }
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Failed to Delete Checkpoint',
      description: 'Delete failed',
      variant: 'destructive',
    });
  });

  it('handles delete error with fallback message', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => '',
    });

    const { result } = renderHook(() => useDeleteCheckpoint(123), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync(1);
      } catch (error) {
        expect(error).toEqual(new Error('Failed to delete checkpoint'));
      }
    });
  });
});
```

## Acceptance Criteria

- [x] Checkpoint panel showing all previous AI sessions
- [x] Visual indicators for current checkpoint and file counts
- [x] Revert confirmation dialog with warning
- [x] Complete project state restoration from checkpoint
- [x] Checkpoint creation on each AI session completion
- [x] Comprehensive test coverage for all checkpoint query hooks
- [x] Comprehensive test coverage for all checkpoint mutation hooks
- [x] Error handling tests for network failures and API errors
- [x] Toast notification tests for user feedback
- [x] Query invalidation tests for cache management
