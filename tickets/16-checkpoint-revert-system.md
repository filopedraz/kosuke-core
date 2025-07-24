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
└── revert-confirmation.tsx
app/(logged-in)/projects/[id]/components/layout/project-content.tsx (update)
app/api/projects/[id]/checkpoints/route.ts
app/api/projects/[id]/revert/route.ts
agent/app/api/routes/checkpoints.py
agent/app/services/checkpoint_service.py
agent/app/models/checkpoint.py
lib/db/schema.ts (add checkpoint tables)
```

## Implementation Details

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

## Acceptance Criteria

- [x] Checkpoint panel showing all previous AI sessions
- [x] Visual indicators for current checkpoint and file counts
- [x] Revert confirmation dialog with warning
- [x] Complete project state restoration from checkpoint
- [x] Checkpoint creation on each AI session completion
