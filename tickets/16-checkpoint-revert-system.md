# 📋 Ticket 16: Assistant Message Revert System

**Priority:** High
**Estimated Effort:** 4 hours

## Description

Implement a message-level revert system that allows users to revert to any previous assistant message state within the current chat session. Each assistant message that results in code changes creates a Git commit, and users can revert to any of these states by clicking on the assistant message in the chat interface.

## Files to Create/Update

```bash
app/(logged-in)/projects/[id]/components/chat/
├── message-revert-button.tsx
├── revert-confirmation-modal.tsx
└── assistant-message.tsx (update)
app/api/projects/[id]/chat-sessions/[sessionId]/revert/route.ts
hooks/use-message-operations.ts
lib/types/chat.ts (update existing)
agent/app/api/routes/revert.py
agent/app/services/git_service.py (update)
lib/db/schema.ts (update chat_messages table)
```

## Implementation Details

### Integration with Multi-Session Architecture

This ticket builds on **Ticket #20: Multiple Chat Sessions** and integrates with the session-based branching system. Each chat session operates on its own Git branch (`kosuke-chat-{session_id}`), and users can revert to any assistant message within the current active session.

**lib/types/chat.ts** - Update existing chat types:

```typescript
// Update existing ChatMessage interface
export interface ChatMessage {
  id: number;
  project_id: number;
  chat_session_id: number; // From ticket #20
  role: 'user' | 'assistant';
  content: string;
  blocks?: MessageBlock[];
  tokens_input?: number;
  tokens_output?: number;
  context_tokens?: number;
  commit_sha?: string; // NEW: Git commit SHA for revert functionality
  created_at: string;
  updated_at: string;
}

// NEW: Revert operation types
export interface RevertToMessageRequest {
  message_id: number;
  create_backup_commit?: boolean;
}

export interface RevertToMessageResponse {
  success: boolean;
  reverted_to_commit: string;
  backup_commit?: string;
  message: string;
}
```

**lib/db/schema.ts** - Update chat_messages table:

```typescript
// Update existing chat_messages table
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  chatSessionId: integer('chat_session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }), // From ticket #20
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  blocks: text('blocks'), // JSON string of MessageBlock[]
  tokensInput: integer('tokens_input'),
  tokensOutput: integer('tokens_output'),
  contextTokens: integer('context_tokens'),
  commitSha: text('commit_sha'), // NEW: Git commit SHA for revert functionality
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Add index for performance
CREATE INDEX idx_chat_messages_commit_sha ON chat_messages(commit_sha);
```

**hooks/use-message-operations.ts** - TanStack Query mutations for message revert operations:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { RevertToMessageRequest, RevertToMessageResponse } from '@/lib/types/chat';
import type { ApiResponse } from '@/lib/api';

export function useRevertToMessage(projectId: number, chatSessionId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RevertToMessageRequest): Promise<RevertToMessageResponse> => {
      const response = await fetch(
        `/api/projects/${projectId}/chat-sessions/${chatSessionId}/revert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to revert to message state');
      }

      const result: ApiResponse<RevertToMessageResponse> = await response.json();
      return result.data;
    },
    onSuccess: result => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['chat-messages', projectId, chatSessionId] });
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });

      toast({
        title: 'Reverted Successfully',
        description: `Reverted to commit ${result.reverted_to_commit.slice(0, 7)}`,
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
```

**app/(logged-in)/projects/[id]/components/chat/message-revert-button.tsx** - Revert button for assistant messages:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RotateCcw, GitCommit } from 'lucide-react';
import { RevertConfirmationModal } from './revert-confirmation-modal';
import type { ChatMessage } from '@/lib/types/chat';

interface MessageRevertButtonProps {
  message: ChatMessage;
  projectId: number;
  chatSessionId: number;
  className?: string;
}

export function MessageRevertButton({
  message,
  projectId,
  chatSessionId,
  className,
}: MessageRevertButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Only show revert button for assistant messages with commit SHA
  if (message.role !== 'assistant' || !message.commit_sha) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}
            onClick={() => setShowConfirmation(true)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <GitCommit className="h-3 w-3" />
            <span>Revert to this state ({message.commit_sha?.slice(0, 7)})</span>
          </div>
        </TooltipContent>
      </Tooltip>

      <RevertConfirmationModal
        message={message}
        projectId={projectId}
        chatSessionId={chatSessionId}
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      />
    </TooltipProvider>
  );
}
```

**app/(logged-in)/projects/[id]/components/chat/revert-confirmation-modal.tsx** - Confirmation modal for reverting:

```tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCcw, AlertTriangle, GitCommit } from 'lucide-react';
import { useRevertToMessage } from '@/hooks/use-message-operations';
import { formatDistanceToNow } from 'date-fns';
import type { ChatMessage } from '@/lib/types/chat';

interface RevertConfirmationModalProps {
  message: ChatMessage;
  projectId: number;
  chatSessionId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function RevertConfirmationModal({
  message,
  projectId,
  chatSessionId,
  isOpen,
  onClose,
}: RevertConfirmationModalProps) {
  const revertMutation = useRevertToMessage(projectId, chatSessionId);

  const handleRevert = () => {
    revertMutation.mutate(
      { message_id: message.id },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Revert to Assistant Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will revert your project to the state when this assistant message was created.
              Any changes made after this point will remain in Git history but won't be visible in
              your working directory.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <GitCommit className="h-4 w-4" />
              Commit Details
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>
                <strong>Commit SHA:</strong> {message.commit_sha}
              </div>
              <div>
                <strong>Created:</strong>{' '}
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </div>
              <div>
                <strong>Message Preview:</strong> {message.content.slice(0, 100)}...
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={revertMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevert}
              className="flex-1"
              disabled={revertMutation.isPending}
            >
              {revertMutation.isPending ? (
                <>
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                  Reverting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Revert Project
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**app/api/projects/[id]/chat-sessions/[sessionId]/revert/route.ts** - API endpoint for reverting to message state:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RevertToMessageRequest } from '@/lib/types/chat';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const sessionId = parseInt(params.sessionId);
    const body: RevertToMessageRequest = await request.json();

    // Verify the message exists and belongs to this session
    const message = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.id, body.message_id),
          eq(chatMessages.projectId, projectId),
          eq(chatMessages.chatSessionId, sessionId)
        )
      )
      .limit(1);

    if (!message[0] || !message[0].commitSha) {
      return NextResponse.json(
        { error: 'Message not found or no commit associated' },
        { status: 404 }
      );
    }

    // Get session info for branch name
    const session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session[0]) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Send revert request to agent service
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/revert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        session_id: session[0].sessionId,
        commit_sha: message[0].commitSha,
        create_backup: body.create_backup_commit || false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to revert', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      data: {
        success: true,
        reverted_to_commit: message[0].commitSha,
        message: `Reverted to commit ${message[0].commitSha?.slice(0, 7)}`,
      },
    });
  } catch (error) {
    console.error('Error reverting to message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**agent/app/api/routes/revert.py** - Agent-side revert endpoint:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from typing import Optional

from app.services.session_manager import SessionManager
from app.services.git_service import GitService

logger = logging.getLogger(__name__)
router = APIRouter()

class RevertRequest(BaseModel):
    project_id: int
    session_id: str
    commit_sha: str
    create_backup: bool = False

class RevertResponse(BaseModel):
    success: bool
    reverted_to_commit: str
    backup_commit: Optional[str] = None
    message: str

@router.post("/revert", response_model=RevertResponse)
async def revert_to_commit(request: RevertRequest):
    """
    Revert session to specific commit SHA
    """
    try:
        logger.info(f"Reverting project {request.project_id} session {request.session_id} to commit {request.commit_sha}")

        session_manager = SessionManager()
        git_service = GitService()

        # Get session path
        session_path = session_manager.get_session_path(request.project_id, request.session_id)
        if not session_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Session environment not found for {request.session_id}"
            )

        # Create backup commit if requested
        backup_commit = None
        if request.create_backup:
            backup_commit = git_service.create_backup_commit(
                session_path,
                f"Backup before reverting to {request.commit_sha[:7]}"
            )

        # Perform git revert operation
        success = git_service.checkout_commit(
            session_path,
            request.commit_sha
        )

        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to revert to commit {request.commit_sha}"
            )

        logger.info(f"✅ Successfully reverted to commit {request.commit_sha}")

        return RevertResponse(
            success=True,
            reverted_to_commit=request.commit_sha,
            backup_commit=backup_commit,
            message=f"Reverted to commit {request.commit_sha[:7]}"
        )

    except Exception as e:
        logger.error(f"❌ Error reverting to commit: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to revert: {str(e)}"
        )
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

**agent/app/services/git_service.py** - Updated GitService with revert functionality:

```python
import subprocess
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class GitService:
    """Enhanced GitService with revert functionality for session management"""

    def checkout_commit(self, session_path: Path, commit_sha: str) -> bool:
        """
        Checkout specific commit in session directory

        Args:
            session_path: Path to session directory
            commit_sha: Git commit SHA to checkout

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            logger.info(f"Checking out commit {commit_sha} in {session_path}")

            # Ensure we're in the right directory
            if not (session_path / '.git').exists():
                logger.error(f"No git repository found in {session_path}")
                return False

            # Checkout the specific commit (detached HEAD state)
            result = subprocess.run(
                ['git', 'checkout', commit_sha],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                logger.error(f"Git checkout failed: {result.stderr}")
                return False

            logger.info(f"✅ Successfully checked out commit {commit_sha}")
            return True

        except Exception as e:
            logger.error(f"❌ Error during git checkout: {e}")
            return False

    def create_backup_commit(self, session_path: Path, message: str) -> Optional[str]:
        """
        Create a backup commit before reverting

        Args:
            session_path: Path to session directory
            message: Commit message for backup

        Returns:
            Optional[str]: Commit SHA if successful, None otherwise
        """
        try:
            # Check if there are any changes to commit
            status_result = subprocess.run(
                ['git', 'status', '--porcelain'],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            if not status_result.stdout.strip():
                logger.info("No changes to backup")
                return None

            # Add all changes
            subprocess.run(
                ['git', 'add', '.'],
                cwd=session_path,
                capture_output=True
            )

            # Create backup commit
            commit_result = subprocess.run(
                ['git', 'commit', '-m', message],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            if commit_result.returncode != 0:
                logger.error(f"Backup commit failed: {commit_result.stderr}")
                return None

            # Get the new commit SHA
            sha_result = subprocess.run(
                ['git', 'rev-parse', 'HEAD'],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            backup_sha = sha_result.stdout.strip()
            logger.info(f"✅ Created backup commit: {backup_sha}")
            return backup_sha

        except Exception as e:
            logger.error(f"❌ Error creating backup commit: {e}")
            return None

    def get_current_commit_sha(self, session_path: Path) -> Optional[str]:
        """
        Get current commit SHA in session directory

        Args:
            session_path: Path to session directory

        Returns:
            Optional[str]: Current commit SHA or None if error
        """
        try:
            result = subprocess.run(
                ['git', 'rev-parse', 'HEAD'],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                return result.stdout.strip()
            else:
                logger.error(f"Failed to get current commit: {result.stderr}")
                return None

        except Exception as e:
            logger.error(f"❌ Error getting current commit: {e}")
            return None
```

**Webhook Service Integration** - Update to include commit SHA linking:

Update the existing `webhook_service.py` to link assistant messages with commit SHAs:

```python
# agent/app/services/webhook_service.py - Update send_assistant_message method

async def send_assistant_message_with_commit(
    self,
    project_id: int,
    chat_session_id: int,
    content: str | None = None,
    blocks: list[dict[str, Any]] | None = None,
    tokens_input: int = 0,
    tokens_output: int = 0,
    context_tokens: int = 0,
    assistant_message_id: int | None = None,
    commit_sha: str | None = None,  # NEW: Commit SHA to link with message
) -> bool:
    """Send assistant message with commit SHA for revert functionality"""
    endpoint = f"/api/projects/{project_id}/webhook/data"
    data = {
        "type": "assistant_message_with_commit",
        "data": {
            "chatSessionId": chat_session_id,
            "content": content,
            "blocks": blocks,
            "tokensInput": tokens_input,
            "tokensOutput": tokens_output,
            "contextTokens": context_tokens,
            "assistantMessageId": assistant_message_id,
            "commitSha": commit_sha,  # NEW: Include commit SHA
        },
    }

    return await self._send_webhook_with_retry(endpoint, data)
```

This requires updating the Next.js webhook handler to process the `commitSha` field and store it in the `chat_messages` table.

## Test Cases

**\_\_tests\_\_/hooks/use-message-operations.test.ts** - Tests for message revert operations:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useRevertToMessage } from '@/hooks/use-message-operations';
import type { RevertToMessageRequest, RevertToMessageResponse } from '@/lib/types/chat';

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

const mockRevertResponse: RevertToMessageResponse = {
  success: true,
  reverted_to_commit: 'abc123def456',
  message: 'Reverted to commit abc123d',
};

describe('useRevertToMessage', () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/hooks/use-toast').useToast.mockReturnValue({ toast: mockToast });
  });

  it('reverts to message successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockRevertResponse,
      }),
    });

    const { result } = renderHook(() => useRevertToMessage(123, 456), {
      wrapper: createWrapper(),
    });

    const revertData: RevertToMessageRequest = {
      message_id: 789,
      create_backup_commit: true,
    };

    await act(async () => {
      await result.current.mutateAsync(revertData);
    });

    expect(fetch).toHaveBeenCalledWith('/api/projects/123/chat-sessions/456/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(revertData),
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Reverted Successfully',
      description: 'Reverted to commit abc123d',
    });
  });

  it('handles revert error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Message not found',
    });

    const { result } = renderHook(() => useRevertToMessage(123, 456), {
      wrapper: createWrapper(),
    });

    const revertData: RevertToMessageRequest = {
      message_id: 999,
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(revertData);
      } catch (error) {
        expect(error).toEqual(new Error('Message not found'));
      }
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Revert Failed',
      description: 'Message not found',
      variant: 'destructive',
    });
  });

  it('invalidates correct queries after successful revert', async () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockRevertResponse,
      }),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRevertToMessage(123, 456), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ message_id: 789 });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['chat-messages', 123, 456] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['project-files', 123] });
  });
});
```

## Integration Requirements

### **Session-Aware Architecture**

This ticket integrates seamlessly with **Ticket #20: Multiple Chat Sessions** by:

1. **Session Isolation**: Each chat session operates in its own Git branch and directory
2. **Message-Level Granularity**: Users can revert to any assistant message within the current session
3. **Branch Context**: Revert operations work within the session's Git branch (`kosuke-chat-{session_id}`)
4. **UI Integration**: Revert buttons appear on assistant messages in the chat interface

### **Workflow Integration**

1. **Agent Creates Commit**: After each assistant message with code changes, agent commits to session branch
2. **Webhook Updates Database**: Commit SHA is linked to the assistant message in `chat_messages` table
3. **UI Shows Revert Options**: Assistant messages with commits display revert buttons on hover
4. **Revert Process**: Clicking revert checks out the specific commit in the session's isolated directory

## Acceptance Criteria

### **Core Functionality**

- [ ] Assistant messages with code changes display revert buttons on hover
- [ ] Revert buttons only appear for assistant messages with associated commit SHAs
- [ ] Clicking revert button opens confirmation modal with commit details
- [ ] Revert operation checks out specific commit in session's isolated directory
- [ ] Reverted state is immediately reflected in project file system

### **Session Integration**

- [ ] Revert operations work within current chat session only
- [ ] Each session's revert operations are completely isolated
- [ ] Agent commits include commit SHA in webhook data
- [ ] Database stores commit SHA in `chat_messages.commit_sha` field
- [ ] UI displays current branch info in model banner

### **Technical Requirements**

- [ ] Database migration adds `commit_sha` column to `chat_messages` table
- [ ] Webhook service updated to include commit SHA in assistant message data
- [ ] Agent service handles revert API with session isolation
- [ ] Git operations target correct session directory
- [ ] Error handling for missing commits or session directories

### **UI/UX Requirements**

- [ ] Revert buttons use consistent styling with tooltip showing commit SHA
- [ ] Confirmation modal clearly explains revert operation and consequences
- [ ] Loading states during revert operation
- [ ] Success/error toast notifications
- [ ] Graceful handling of failed revert operations

### **Quality Assurance**

- [ ] Comprehensive test coverage for revert hook functionality
- [ ] Integration tests with session isolation
- [ ] Git operation tests for checkout functionality
- [ ] Error handling tests for edge cases
- [ ] Cross-browser compatibility for UI components
