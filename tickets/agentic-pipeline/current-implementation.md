# Current Chat Interface Implementation

This document provides a comprehensive overview of how the chat interface, streaming, and database operations work in the Kosuke platform.

## Architecture Overview

The chat system consists of several interconnected components that handle real-time messaging, file operations tracking, and streaming responses from the AI agent.

### Core Components

1. **`page.tsx`** - Server-side component that fetches initial data
2. **`project-content.tsx`** - Layout orchestrator
3. **`chat-interface.tsx`** - Main chat interface with real-time features
4. **`chat-message.tsx`** - Individual message renderer
5. **`assistant-actions-card.tsx`** - File operations display

## Information Flow

```
User Input → Optimistic Update → API Call → Streaming → Database Save → SSE Update → UI Refresh
```

## Detailed Component Analysis

### 1. Server-Side Data Fetching (`page.tsx`)

The server component handles initial data loading and database queries:

```typescript
// Fetch messages with associated actions from database
async function fetchChatHistoryForProject(projectId: number): Promise<FetchedChatMessage[]> {
  // 1. Fetch chat history, oldest first
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.projectId, projectId))
    .orderBy(chatMessages.timestamp);

  // 2. Extract assistant message IDs
  const assistantMessageIds = history.filter(msg => msg.role === 'assistant').map(msg => msg.id);

  // 3. Fetch actions for these messages
  let fetchedActions: Action[] = [];
  if (assistantMessageIds.length > 0) {
    fetchedActions = await db
      .select()
      .from(actions)
      .where(inArray(actions.messageId, assistantMessageIds));
  }

  // 4. Group actions by message ID and combine with messages
  const actionsByMessageId = fetchedActions.reduce<Record<number, Action[]>>((acc, action) => {
    if (!acc[action.messageId]) {
      acc[action.messageId] = [];
    }
    acc[action.messageId].push(action);
    return acc;
  }, {});

  return history.map(msg => ({
    ...msg,
    actions: actionsByMessageId[msg.id] || [],
  }));
}
```

**Key Features:**

- Fetches chat messages in chronological order
- Joins with `actions` table to get file operations
- Groups actions by message ID for efficient rendering
- Returns complete message history with associated file operations

### 2. Layout Orchestration (`project-content.tsx`)

Manages the layout between chat and preview panels:

```typescript
export default function ProjectContent({
  projectId,
  project,
  isNewProject = false,
  initialMessages,
}: ProjectContentProps) {
  const currentView = useProjectStore(state => state.currentView);
  const isChatCollapsed = useProjectStore(state => state.isChatCollapsed);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      {/* Chat Panel */}
      <div className={cn(
        "h-full overflow-hidden flex flex-col",
        isChatCollapsed ? "w-0 opacity-0" : "w-full md:w-1/3 lg:w-1/4"
      )}>
        <ChatInterface
          projectId={projectId}
          initialMessages={initialMessages}
          isLoading={false}
        />
      </div>

      {/* Preview/Code Panel */}
      <div className={cn(
        "h-full flex-col overflow-hidden border rounded-md border-border",
        isChatCollapsed ? "w-full" : "hidden md:flex md:w-2/3 lg:w-3/4"
      )}>
        {/* Dynamic content based on currentView */}
      </div>
    </div>
  );
}
```

### 3. Main Chat Interface (`chat-interface.tsx`)

The core component handling real-time chat functionality:

#### A. TanStack Query Setup

```typescript
// Query for messages with real-time token tracking
const {
  data: messages = [],
  isLoading: isLoadingMessages,
  refetch,
} = useQuery({
  queryKey: ['messages', projectId],
  queryFn: async () => {
    const messages = await fetchMessages(projectId);

    // Calculate token usage from messages
    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    let currentContextSize = 0;

    if (messages.length > 0) {
      const sortedMessages = [...messages].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (sortedMessages[0].contextTokens) {
        currentContextSize = sortedMessages[0].contextTokens;
      }

      messages.forEach(msg => {
        if (msg.tokensInput) totalTokensInput += msg.tokensInput;
        if (msg.tokensOutput) totalTokensOutput += msg.tokensOutput;
      });
    }

    setTokenUsage({
      tokensSent: totalTokensInput,
      tokensReceived: totalTokensOutput,
      contextSize: currentContextSize,
    });

    return messages;
  },
  initialData:
    initialMessages.length > 0
      ? initialMessages.map(msg => ({ ...msg, isLoading: false, className: '' }))
      : undefined,
  enabled: !initialIsLoading,
  staleTime: 60000,
});
```

#### B. Message Sending with Optimistic Updates

```typescript
const { mutate, isPending: isSending } = useMutation({
  mutationFn: (args: {
    content: string;
    options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File };
  }) => sendMessage(projectId, args.content, args.options, startStreamingProcessing),

  onMutate: async newMessage => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['messages', projectId] });

    // Save for regeneration
    setLastUserMessage(newMessage.content);
    setLastMessageOptions(newMessage.options || null);

    // Optimistic update - add user message immediately
    queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) => [
      ...old,
      {
        id: Date.now(),
        content: newMessage.content,
        role: 'user',
        timestamp: new Date(),
        isLoading: false,
      },
    ]);

    // Handle image attachments
    if (newMessage.options?.imageFile) {
      const dataUrl = await readFileAsDataURL(newMessage.options.imageFile);
      const imageMarkdown = `[Attached Image](${dataUrl})`;
      // Update optimistic content with image
    }
  },

  onError: (error, _, context) => {
    // Rollback on error
    if (context?.previousMessages) {
      queryClient.setQueryData(['messages', projectId], context.previousMessages);
    }
    setIsError(true);
    setErrorMessage(error.message);
  },

  onSuccess: data => {
    // Trigger preview refresh if files were updated
    if (data.fileUpdated) {
      const fileUpdatedEvent = new CustomEvent('file-updated', {
        detail: { projectId },
      });
      window.dispatchEvent(fileUpdatedEvent);
    }
    queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
  },
});
```

#### C. Real-time Streaming Implementation

```typescript
// Streaming processing function
const startStreamingProcessing = async (content: string) => {
  setIsStreaming(true);
  setStreamingMessages([]);

  const response = await fetch(`/api/projects/${projectId}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        updateStreamingMessage(data);
      }
    }
  }
};

// Real-time UI updates during streaming
const updateStreamingMessage = (data: {
  type: string;
  message: string;
  file_path?: string;
  status?: string;
}) => {
  let content = data.message;
  if (data.type === 'read') {
    content = `📖 Reading ${data.file_path}: ${data.message}`;
  } else if (data.type === 'thinking') {
    content = `🤔 ${data.message}`;
  } else if (data.type === 'write') {
    content = `✏️ Writing ${data.file_path}: ${data.message}`;
  } else if (data.type === 'completed') {
    setIsStreaming(false);
    setStreamingMessages([]);
    queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
    return;
  }

  const newMessage: ChatMessageProps = {
    content,
    role: 'assistant',
    timestamp: new Date(),
    isLoading: data.status === 'pending',
  };

  setStreamingMessages(prev => {
    // Replace previous message of same type
    const messageKey = `${data.type}-${data.file_path || 'general'}`;
    const filtered = prev.filter(msg => /* filter logic */);
    return [...filtered, newMessage];
  });
};
```

#### D. Server-Sent Events (SSE) for Real-time Updates

```typescript
useEffect(() => {
  const eventSource = new EventSource(`/api/projects/${projectId}/chat/sse`);

  eventSource.onmessage = event => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case 'new_message':
        queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
        if (data.role === 'assistant') {
          // Trigger preview refresh
          window.dispatchEvent(
            new CustomEvent('refresh-preview', {
              detail: { projectId },
            })
          );
        }
        break;

      case 'file_updated':
        window.dispatchEvent(
          new CustomEvent('file-updated', {
            detail: { projectId },
          })
        );
        break;

      case 'token_update':
        setTokenUsage({
          tokensSent: data.tokens.tokensSent,
          tokensReceived: data.tokens.tokensReceived,
          contextSize: data.tokens.contextSize,
        });
        break;

      case 'error':
        setIsError(true);
        setErrorType(data.errorType || 'unknown');
        setErrorMessage(data.message || 'An error occurred');
        break;
    }
  };

  return () => eventSource.close();
}, [projectId, queryClient]);
```

### 4. Message Rendering (`chat-message.tsx`)

Handles individual message display with support for images, errors, and file operations:

```typescript
export default function ChatMessage({
  content,
  role,
  timestamp,
  actions,
  hasError,
  errorType,
  onRegenerate,
}: ChatMessageProps) {
  // Process content to extract images
  const processContent = (content: string) => {
    const imageRegex = /\[Attached Image\]\(([^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'image'; content: string }> = [];

    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
      parts.push({ type: 'image', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    const textAfter = content.substring(lastIndex).trim();
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }

    return parts.length === 0 ? [{ type: 'text', content }] : parts;
  };

  const contentParts = processContent(content);

  return (
    <div className="flex w-full max-w-[95%] mx-auto gap-3 p-4">
      {/* Avatar */}
      {showAvatar && (
        <Avatar className="h-8 w-8">
          {/* Avatar content */}
        </Avatar>
      )}

      <div className="flex-1 space-y-2">
        {/* Message content with image support */}
        {contentParts.map((part, i) => (
          part.type === 'text' ? (
            part.content.split('\n').map((line, j) => (
              <p key={`${i}-${j}`}>{line}</p>
            ))
          ) : (
            <div key={i} className="my-2 inline-block max-w-[400px]">
              <Image src={part.content} alt="Attached Image" />
            </div>
          )
        ))}

        {/* File operations display */}
        {!isUser && actions && actions.length > 0 && (
          <AssistantActionsCard operations={actions} />
        )}

        {/* Error handling */}
        {!isUser && hasError && (
          <div className="mt-3 p-2 rounded-md bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{getErrorMessage(errorType)}</span>
            </div>
            {onRegenerate && (
              <button onClick={onRegenerate}>
                <RefreshCcw className="h-3 w-3" /> Regenerate response
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5. File Operations Display (`assistant-actions-card.tsx`)

Shows file operations performed by the AI agent:

```typescript
export default function AssistantActionsCard({
  operations = [],
}: AssistantActionsCardProps) {
  // Filter out operations with empty paths
  const validOperations = operations.filter(op => op.path.trim() !== '');

  // Group operations by file path to avoid duplicates
  const uniqueOperations = validOperations.reduce<Record<string, Action>>((acc, operation) => {
    if (!acc[operation.path] ||
        new Date(operation.timestamp) > new Date(acc[operation.path].timestamp)) {
      acc[operation.path] = operation;
    }
    return acc;
  }, {});

  // Sort by timestamp (newest first)
  const sortedOperations = Object.values(uniqueOperations)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (sortedOperations.length === 0) return null;

  return (
    <div className="w-full mt-3 space-y-1 rounded-md">
      <div className="max-h-[210px] overflow-y-auto">
        {sortedOperations.map((op, index) => (
          <Card key={`${op.path}-${index}`} className="bg-muted/50 border-muted-foreground/50 mb-1">
            <CardContent className="p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                {/* Icon based on operation type and status */}
                {op.status === 'pending' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : op.type === 'read' ? (
                  <EyeIcon className="h-3.5 w-3.5" />
                ) : op.type === 'edit' ? (
                  <PencilIcon className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span className="truncate">{op.path}</span>
              </div>
              <div className="text-muted-foreground text-xs">
                {op.type === 'create' ? 'Generated' :
                 op.type === 'edit' ? 'Edited' :
                 op.type === 'read' ? 'Read' : 'Unknown Action'}
                {op.status === 'pending' && <span>(in progress)</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## API Endpoints

### 1. Chat Message Endpoint (`/api/projects/[id]/chat`)

**POST** - Saves user message and initiates processing:

```typescript
// Request body
{
  content: string;
  includeContext?: boolean;
  contextFiles?: string[];
  // OR FormData for image uploads
}

// Response
{
  message: ApiChatMessage;
  success: boolean;
  fileUpdated?: boolean;
  totalTokensInput?: number;
  totalTokensOutput?: number;
  contextTokens?: number;
  error?: string;
  errorType?: ErrorType;
}
```

**GET** - Retrieves chat history:

```typescript
// Response
{
  messages: ApiChatMessage[];
}

interface ApiChatMessage {
  id: number;
  projectId: number;
  userId: number | null;
  content: string;
  role: string;
  timestamp: string | Date;
  actions?: ExtendedAction[];
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  metadata?: string; // JSON string with error info
}
```

### 2. Streaming Endpoint (`/api/projects/[id]/chat/stream`)

**POST** - Initiates streaming processing:

```typescript
// Request
{ content: string }

// Server-Sent Events Response
data: {"type": "thinking", "message": "Analyzing request..."}
data: {"type": "read", "file_path": "src/app.js", "message": "Reading file content"}
data: {"type": "write", "file_path": "src/components/Button.js", "message": "Creating component"}
data: {"type": "completed", "message": "Task completed"}
```

### 3. Server-Sent Events Endpoint (`/api/projects/[id]/chat/sse`)

**GET** - Establishes SSE connection for real-time updates:

```typescript
// Event types
{
  type: 'new_message',
  role: 'assistant' | 'user'
}

{
  type: 'file_updated'
}

{
  type: 'token_update',
  tokens: {
    tokensSent: number;
    tokensReceived: number;
    contextSize: number;
  }
}

{
  type: 'error',
  errorType: ErrorType;
  message: string;
}

{
  type: 'heartbeat'  // Keep connection alive
}
```

## Database Schema

### Chat Messages Table

```sql
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id INTEGER,
  content TEXT NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  timestamp TIMESTAMP DEFAULT NOW(),
  tokens_input INTEGER,
  tokens_output INTEGER,
  context_tokens INTEGER,
  metadata JSONB -- For error information
);
```

### Actions Table

```sql
CREATE TABLE actions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES chat_messages(id),
  path VARCHAR(500) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'create', 'edit', 'read', 'delete', etc.
  timestamp TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'error'
  content TEXT, -- Optional content for the operation
  language VARCHAR(50) -- Programming language if applicable
);
```

## Key Features

### 1. Optimistic Updates

- User messages appear immediately in the UI
- Rollback on error with proper error handling
- Maintains responsive feel during network operations

### 2. Real-time Streaming

- Live progress updates during AI processing
- Visual indicators for different operation types
- Graceful fallback to polling if streaming fails

### 3. File Operations Tracking

- Associates file operations with specific messages
- Deduplicates operations by path and timestamp
- Visual status indicators (pending, completed, error)

### 4. Error Handling

- Typed error system with specific error types
- Regeneration functionality for failed responses
- User-friendly error messages with retry options

### 5. Token Usage Tracking

- Real-time token consumption monitoring
- Context size tracking for long conversations
- Usage displayed in the UI for transparency

## Performance Optimizations

1. **Efficient Queries**: Joins messages with actions in a single database query
2. **Optimistic Updates**: Immediate UI feedback without waiting for server
3. **Streaming**: Progressive response rendering for better perceived performance
4. **SSE with Heartbeats**: Reliable real-time connection with reconnection logic
5. **Query Caching**: TanStack Query caches results and manages invalidation
6. **Debounced Updates**: Prevents excessive re-renders during streaming

This architecture provides a robust, real-time chat experience with comprehensive file operation tracking and error handling.
