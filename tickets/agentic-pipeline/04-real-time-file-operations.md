# Ticket 04: Real-time File Operations Display

## Overview

Enhance the `assistant-actions-card` component to display file operations in real-time as they happen during streaming, with better status indicators, progress tracking, and live updates following Dyad's approach.

## Current State

- File operations appear only after streaming completes
- Static status indicators (pending/completed/error)
- No real-time progress tracking
- Operations grouped and deduplicated at the end
- Limited visual feedback during processing

## Target State (Dyad Approach)

- File operations appear as they are detected during streaming
- Real-time status updates (pending → in-progress → completed)
- Live progress indicators for each operation
- Operations stream in as they happen
- Better visual hierarchy and status communication

## Implementation Details

### 1. Enhanced Action Interface

```typescript
// lib/types/actions.ts - Extended action interface
export interface Action {
  path: string;
  type: 'create' | 'update' | 'delete' | 'edit' | 'read' | 'search' | 'createDir' | 'removeDir';
  timestamp: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  messageId?: number;
  language?: string;
  content?: string;
  // New fields for real-time tracking
  progress?: number; // 0-100 for progress indicators
  description?: string; // Human-readable description
  size?: number; // File size for progress calculation
  isStreaming?: boolean; // Currently being processed
  tempId?: string; // Temporary ID for tracking during streaming
}

// Streaming action events
export interface ActionStreamEvent {
  type: 'action_start' | 'action_progress' | 'action_complete' | 'action_error';
  tempId: string; // Temporary ID for tracking
  messageId: number;
  action: Partial<Action>;
  progress?: number;
  error?: string;
}
```

### 2. Real-time Actions Card Component

```typescript
// assistant-actions-card.tsx - Enhanced for real-time streaming
export interface AssistantActionsCardProps {
  operations: Action[];
  isStreaming?: boolean; // Whether parent message is streaming
  onActionUpdate?: (action: Action) => void; // Callback for action updates
  className?: string;
}

export default function AssistantActionsCard({
  operations = [],
  isStreaming = false,
  onActionUpdate,
  className
}: AssistantActionsCardProps) {
  // Enhanced state management for real-time updates
  const [localOperations, setLocalOperations] = useState<Action[]>(operations);
  const [animatingOps, setAnimatingOps] = useState<Set<string>>(new Set());

  // Update local operations when props change
  useEffect(() => {
    setLocalOperations(operations);
  }, [operations]);

  // Handle real-time action updates
  const handleActionUpdate = useCallback((updatedAction: Action) => {
    setLocalOperations(prev => {
      const existing = prev.find(op =>
        op.tempId === updatedAction.tempId ||
        (op.path === updatedAction.path && op.type === updatedAction.type)
      );

      if (existing) {
        // Update existing operation
        return prev.map(op =>
          (op.tempId === updatedAction.tempId ||
           (op.path === updatedAction.path && op.type === updatedAction.type))
            ? { ...op, ...updatedAction }
            : op
        );
      } else {
        // Add new operation with animation
        if (updatedAction.tempId) {
          setAnimatingOps(prev => new Set([...prev, updatedAction.tempId!]));
          // Remove animation after a delay
          setTimeout(() => {
            setAnimatingOps(prev => {
              const next = new Set(prev);
              next.delete(updatedAction.tempId!);
              return next;
            });
          }, 500);
        }
        return [...prev, updatedAction];
      }
    });

    // Notify parent component
    onActionUpdate?.(updatedAction);
  }, [onActionUpdate]);

  // Group and sort operations for display
  const displayOperations = useMemo(() => {
    // Filter out operations with empty paths
    const validOps = localOperations.filter(op => op.path.trim() !== '');

    // Group by path to show latest status
    const grouped = validOps.reduce<Record<string, Action>>((acc, op) => {
      const key = `${op.path}-${op.type}`;
      if (!acc[key] || new Date(op.timestamp) > new Date(acc[key].timestamp)) {
        acc[key] = op;
      }
      return acc;
    }, {});

    // Sort by timestamp (newest first)
    return Object.values(grouped).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [localOperations]);

  if (displayOperations.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full mt-3 space-y-1 rounded-md", className)}>
      {/* Header with operation count and streaming status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>File Operations ({displayOperations.length})</span>
        {isStreaming && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>Processing...</span>
          </div>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto space-y-1">
        {displayOperations.map((op, index) => (
          <ActionOperationCard
            key={`${op.path}-${op.type}-${index}`}
            operation={op}
            isNew={animatingOps.has(op.tempId || '')}
            isStreaming={isStreaming}
          />
        ))}
      </div>
    </div>
  );
}

// Individual operation card component
interface ActionOperationCardProps {
  operation: Action;
  isNew?: boolean;
  isStreaming?: boolean;
}

function ActionOperationCard({
  operation,
  isNew = false,
  isStreaming = false
}: ActionOperationCardProps) {
  const getStatusIcon = () => {
    switch (operation.status) {
      case 'pending':
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'in-progress':
        return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
      case 'completed':
        return <Check className="h-3.5 w-3.5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getOperationIcon = () => {
    switch (operation.type) {
      case 'read':
        return <EyeIcon className="h-3.5 w-3.5 text-blue-500" />;
      case 'edit':
      case 'update':
        return <PencilIcon className="h-3.5 w-3.5 text-orange-500" />;
      case 'create':
        return <PlusIcon className="h-3.5 w-3.5 text-green-500" />;
      case 'delete':
        return <TrashIcon className="h-3.5 w-3.5 text-red-500" />;
      case 'search':
        return <Search className="h-3.5 w-3.5 text-purple-500" />;
      case 'createDir':
        return <FolderPlusIcon className="h-3.5 w-3.5 text-green-500" />;
      case 'removeDir':
        return <FolderMinusIcon className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (operation.status) {
      case 'pending':
        return 'Queued';
      case 'in-progress':
        return 'Processing...';
      case 'completed':
        return getActionText(operation.type);
      case 'error':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getActionText = (type: Action['type']) => {
    switch (type) {
      case 'create':
        return 'Created';
      case 'edit':
      case 'update':
        return 'Modified';
      case 'delete':
        return 'Deleted';
      case 'read':
        return 'Read';
      case 'search':
        return 'Searched';
      case 'createDir':
        return 'Created Directory';
      case 'removeDir':
        return 'Removed Directory';
      default:
        return 'Processed';
    }
  };

  return (
    <Card className={cn(
      "bg-muted/30 border-muted-foreground/30 transition-all duration-300",
      isNew && "animate-in slide-in-from-top-2 fade-in-0 duration-500",
      operation.status === 'in-progress' && "border-primary/50 bg-primary/5",
      operation.status === 'completed' && "border-green-500/30 bg-green-500/5",
      operation.status === 'error' && "border-destructive/50 bg-destructive/5"
    )}>
      <CardContent className="p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate max-w-[70%]">
          {/* Operation type icon */}
          {getOperationIcon()}

          {/* File path */}
          <span className="truncate text-foreground font-medium [overflow-wrap:anywhere] break-words">
            {operation.path}
          </span>

          {/* Progress indicator for in-progress operations */}
          {operation.status === 'in-progress' && operation.progress !== undefined && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${operation.progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {operation.progress}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status icon */}
          {getStatusIcon()}

          {/* Status text */}
          <span className={cn(
            "text-xs",
            operation.status === 'in-progress' && "text-primary",
            operation.status === 'completed' && "text-green-600",
            operation.status === 'error' && "text-destructive",
            operation.status === 'pending' && "text-muted-foreground"
          )}>
            {getStatusText()}
          </span>

          {/* Description tooltip for detailed operations */}
          {operation.description && (
            <div className="relative group">
              <InfoIcon className="h-3 w-3 text-muted-foreground" />
              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {operation.description}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Backend Streaming Updates

```typescript
// lib/streaming/action-processor.ts - Real-time action processing
export interface ActionProcessor {
  onActionStart: (action: Partial<Action>) => void;
  onActionProgress: (tempId: string, progress: number) => void;
  onActionComplete: (tempId: string, result: Action) => void;
  onActionError: (tempId: string, error: string) => void;
}

export async function processActionStream(
  action: Action,
  processor: ActionProcessor
): Promise<void> {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Notify action start
    processor.onActionStart({
      ...action,
      tempId,
      status: 'in-progress',
      progress: 0,
    });

    // Simulate processing with progress updates
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
      processor.onActionProgress(tempId, progress);
    }

    // Complete the action
    const completedAction: Action = {
      ...action,
      tempId,
      status: 'completed',
      progress: 100,
      timestamp: new Date(),
    };

    processor.onActionComplete(tempId, completedAction);
  } catch (error) {
    processor.onActionError(tempId, error.message);
  }
}

// Updated streaming handler to include action events
export async function processStreamingChat({
  projectId,
  userMessage,
  assistantMessageId,
  controller,
  encoder,
}: StreamingChatParams) {
  // ... existing streaming logic

  // Action processor for real-time updates
  const actionProcessor: ActionProcessor = {
    onActionStart: action => {
      const actionEvent = JSON.stringify({
        type: 'action_start',
        messageId: assistantMessageId,
        action,
      });
      controller.enqueue(encoder.encode(`data: ${actionEvent}\n\n`));
    },

    onActionProgress: (tempId, progress) => {
      const progressEvent = JSON.stringify({
        type: 'action_progress',
        tempId,
        progress,
      });
      controller.enqueue(encoder.encode(`data: ${progressEvent}\n\n`));
    },

    onActionComplete: (tempId, result) => {
      // Save to database
      db.insert(actions).values({
        messageId: assistantMessageId,
        path: result.path,
        type: result.type,
        status: result.status,
        timestamp: result.timestamp,
      });

      const completeEvent = JSON.stringify({
        type: 'action_complete',
        tempId,
        action: result,
      });
      controller.enqueue(encoder.encode(`data: ${completeEvent}\n\n`));
    },

    onActionError: (tempId, error) => {
      const errorEvent = JSON.stringify({
        type: 'action_error',
        tempId,
        error,
      });
      controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
    },
  };

  // Process actions as they are detected in the AI response
  // This would integrate with the AI response parsing logic
}
```

### 4. Frontend Integration

```typescript
// chat-interface.tsx - Enhanced action handling
const handleStreamingEvent = useCallback(
  (data: any) => {
    switch (data.type) {
      case 'action_start':
        // Add new action in pending state
        queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
          old.map(msg =>
            msg.id === data.messageId
              ? {
                  ...msg,
                  actions: [...(msg.actions || []), data.action],
                }
              : msg
          )
        );
        break;

      case 'action_progress':
        // Update action progress
        queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
          old.map(msg =>
            msg.id === data.messageId
              ? {
                  ...msg,
                  actions:
                    msg.actions?.map(action =>
                      action.tempId === data.tempId
                        ? { ...action, progress: data.progress }
                        : action
                    ) || [],
                }
              : msg
          )
        );
        break;

      case 'action_complete':
        // Mark action as completed
        queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
          old.map(msg =>
            msg.id === data.messageId
              ? {
                  ...msg,
                  actions:
                    msg.actions?.map(action =>
                      action.tempId === data.tempId ? { ...action, ...data.action } : action
                    ) || [],
                }
              : msg
          )
        );
        break;

      case 'action_error':
        // Mark action as failed
        queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
          old.map(msg =>
            msg.id === data.messageId
              ? {
                  ...msg,
                  actions:
                    msg.actions?.map(action =>
                      action.tempId === data.tempId
                        ? { ...action, status: 'error', error: data.error }
                        : action
                    ) || [],
                }
              : msg
          )
        );
        break;

      // ... other event types
    }
  },
  [queryClient, projectId]
);
```

### 5. Enhanced Visual States

```typescript
// Add CSS animations for real-time updates
const actionCardStyles = `
  @keyframes slide-in-action {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse-progress {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .action-card-new {
    animation: slide-in-action 0.3s ease-out;
  }

  .action-progress-bar {
    animation: pulse-progress 2s infinite;
  }
`;
```

## Breaking Changes

1. **Enhanced Action Interface**: New fields for real-time tracking
2. **Component Props**: New props for streaming state and callbacks
3. **Event Handling**: New action-specific streaming events
4. **Status Management**: More granular status tracking
5. **Animation States**: New animation and transition logic

## Benefits

1. **Real-time Feedback**: See operations as they happen
2. **Better Progress Tracking**: Visual progress indicators
3. **Improved Status Communication**: Clear visual hierarchy
4. **Enhanced User Experience**: Less waiting, more transparency
5. **Error Visibility**: Immediate feedback on failures

## Testing Requirements

1. **Real-time Updates**: Test action streaming during chat
2. **Progress Indicators**: Test progress bar functionality
3. **Error Handling**: Test various failure scenarios
4. **Performance**: Ensure smooth updates with many operations
5. **Animation**: Test entry/exit animations

## Acceptance Criteria

- [ ] Actions appear in real-time during streaming
- [ ] Progress indicators work correctly
- [ ] Status updates happen immediately
- [ ] Visual hierarchy is clear and informative
- [ ] Animations are smooth and non-intrusive
- [ ] Error states are clearly communicated
- [ ] Performance remains good with many operations
- [ ] Component is accessible with screen readers

## Estimated Effort

**Medium**: ~1-2 days

This ticket makes file operations feel immediate and transparent, following Dyad's approach of showing users exactly what's happening as it happens.
