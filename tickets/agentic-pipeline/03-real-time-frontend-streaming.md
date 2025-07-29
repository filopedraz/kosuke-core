# Ticket 03: Real-time Frontend Streaming Experience

## Overview

Update the frontend chat interface to follow Dyad's approach: remove skeleton loaders, display streaming text in real-time, add stream cancellation functionality, and improve the overall user experience during AI response generation.

## Current State

- Shows skeleton loaders while waiting for responses
- Displays "Generating response..." with animated dots
- No cancellation option during streaming
- Messages appear only after completion
- Loading states managed separately from content

## Target State (Dyad Approach)

- Show streaming text as it arrives in real-time
- Remove skeleton loaders entirely
- Add cancel button during active streams
- Messages appear immediately and fill with content
- Unified loading state management

## Implementation Details

### 1. Remove Skeleton Loading States

```typescript
// chat-interface.tsx - Remove skeleton rendering logic

// ❌ REMOVE: Current skeleton approach
{messages.length === 0 && isLoadingMessages ? (
  <div className="flex items-center justify-center h-32">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
) : (
  // Message rendering
)}

// ✅ NEW: No skeleton loaders needed - messages stream in real-time
{messages.length === 0 ? (
  <div className="flex items-center justify-center h-32 text-muted-foreground">
    No messages yet. Start a conversation!
  </div>
) : (
  enhancedMessages.map(message => (
    <ChatMessage key={message.id} {...message} />
  ))
)}
```

### 2. Real-time Streaming Message Component

```typescript
// chat-message.tsx - Enhanced for real-time streaming
export interface ChatMessageProps {
  id?: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isLoading?: boolean; // Indicates active streaming
  isStreaming?: boolean; // More specific streaming state
  canCancel?: boolean; // Can this stream be cancelled
  onCancel?: () => void; // Cancel callback
  className?: string;
  user?: {
    name?: string;
    email?: string;
    imageUrl?: string;
  };
  actions?: Action[];
  showAvatar?: boolean;
  hasError?: boolean;
  errorType?: ErrorType;
  onRegenerate?: () => void;
}

export default function ChatMessage({
  content,
  role,
  timestamp,
  isLoading = false,
  isStreaming = false,
  canCancel = false,
  onCancel,
  // ... other props
}: ChatMessageProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  return (
    <div className={cn(
      'flex w-full max-w-[95%] mx-auto gap-3 p-4',
      isUser ? 'bg-background' : 'bg-background',
      !showAvatar && 'pt-1',
      // Highlight streaming messages slightly
      isStreaming && 'bg-muted/20',
      className
    )}>
      {/* Avatar section - unchanged */}
      {showAvatar && (
        <Avatar className="h-8 w-8">
          {/* Avatar implementation */}
        </Avatar>
      )}

      <div className="flex-1 space-y-2">
        {/* Header with streaming indicator and cancel button */}
        {showAvatar && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4>{isUser ? 'You' : 'AI Assistant'}</h4>
              {/* Real-time streaming indicator */}
              {isStreaming && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                  </div>
                  <span>Streaming...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Cancel button for streaming messages */}
              {canCancel && isStreaming && onCancel && (
                <button
                  onClick={onCancel}
                  className="p-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  title="Cancel streaming"
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              <time className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
              </time>
            </div>
          </div>
        )}

        {/* Message content - streams in real-time */}
        <div className={cn(
          "prose prose-xs dark:prose-invert max-w-none text-sm [overflow-wrap:anywhere]",
          !showAvatar && "mt-0",
          hasError && !isUser && "text-muted-foreground"
        )}>
          {/* Show content as it streams */}
          {content ? (
            // Process and display content parts
            processContent(content).map((part, i) => (
              part.type === 'text' ? (
                part.content.split('\n').map((line, j) => (
                  <p key={`${i}-${j}`} className={cn(
                    line.trim() === '' ? 'h-4' : '[word-break:normal] [overflow-wrap:anywhere]',
                    // Add subtle animation for streaming text
                    isStreaming && 'animate-in fade-in duration-200'
                  )}>
                    {line}
                  </p>
                ))
              ) : (
                // Handle image content
                <div key={i} className="my-2 inline-block max-w-[400px]">
                  {/* Image rendering logic */}
                </div>
              )
            ))
          ) : (
            // Empty content state during initial streaming
            isStreaming && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span>AI is thinking...</span>
              </div>
            )
          )}

          {/* File operations - update in real-time */}
          {!isUser && actions && actions.length > 0 && (
            <AssistantActionsCard operations={actions} isStreaming={isStreaming} />
          )}

          {/* Error handling - unchanged */}
          {!isUser && hasError && (
            <div className="mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-sm">
              {/* Error display logic */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 3. Stream Cancellation Management

```typescript
// chat-interface.tsx - Add cancellation state and handlers

const ChatInterface = ({ projectId, initialMessages = [] }: ChatInterfaceProps) => {
  // Add cancellation state
  const [activeStreamId, setActiveStreamId] = useState<number | null>(null);
  const [streamController, setStreamController] = useState<AbortController | null>(null);

  // Enhanced mutation with cancellation support
  const { mutate, isPending: isSending } = useMutation({
    mutationFn: async (args: { content: string; options?: MessageOptions }) => {
      // Create abort controller for this stream
      const controller = new AbortController();
      setStreamController(controller);

      try {
        const response = await fetch(`/api/projects/${projectId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: args.content,
            includeContext: args.options?.includeContext || false,
            contextFiles: args.options?.contextFiles || [],
          }),
          signal: controller.signal, // Add abort signal
        });

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Check if cancelled
          if (controller.signal.aborted) {
            throw new Error('Stream cancelled by user');
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));
              handleStreamingEvent(data);
            }
          }
        }
      } finally {
        setStreamController(null);
        setActiveStreamId(null);
      }
    },

    onMutate: async variables => {
      // Reset cancellation states
      setActiveStreamId(null);
      setStreamController(null);

      // Save for regeneration
      setLastUserMessage(variables.content);
      setLastMessageOptions(variables.options || null);
    },

    onError: error => {
      if (error.message === 'Stream cancelled by user') {
        console.log('Stream was cancelled by user');
      } else {
        setIsError(true);
        setErrorMessage(error.message);
      }
    },
  });

  // Cancel stream handler
  const handleCancelStream = useCallback(() => {
    if (streamController) {
      streamController.abort();
      setStreamController(null);
      setActiveStreamId(null);

      // Update the streaming message to show it was cancelled
      if (activeStreamId) {
        queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
          old.map(msg =>
            msg.id === activeStreamId
              ? {
                  ...msg,
                  content: msg.content + '\n\n*[Response cancelled by user]*',
                  isLoading: false,
                  isStreaming: false,
                  canCancel: false,
                }
              : msg
          )
        );
      }
    }
  }, [streamController, activeStreamId, queryClient, projectId]);

  // Enhanced streaming event handler
  const handleStreamingEvent = useCallback(
    (data: any) => {
      switch (data.type) {
        case 'message_created':
          // Set active stream ID for cancellation
          setActiveStreamId(data.assistantMessage.id);

          // Add messages to UI
          queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) => [
            ...old,
            {
              id: data.userMessage.id,
              content: data.userMessage.content,
              role: 'user',
              timestamp: new Date(data.userMessage.timestamp),
              isLoading: false,
            },
            {
              id: data.assistantMessage.id,
              content: data.assistantMessage.content,
              role: 'assistant',
              timestamp: new Date(data.assistantMessage.timestamp),
              isLoading: true,
              isStreaming: true,
              canCancel: true,
              onCancel: handleCancelStream,
            },
          ]);
          break;

        case 'message_chunk':
          // Update content in real-time
          queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
            old.map(msg =>
              msg.id === data.messageId
                ? {
                    ...msg,
                    content: data.content,
                    isLoading: data.isStreaming,
                    isStreaming: data.isStreaming,
                    canCancel: data.isStreaming,
                  }
                : msg
            )
          );
          break;

        case 'stream_complete':
          // Mark as complete, remove cancel option
          setActiveStreamId(null);
          queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
            old.map(msg =>
              msg.id === data.messageId
                ? {
                    ...msg,
                    content: data.finalContent,
                    isLoading: false,
                    isStreaming: false,
                    canCancel: false,
                    onCancel: undefined,
                  }
                : msg
            )
          );
          break;

        case 'stream_error':
          // Handle errors, remove cancel option
          setActiveStreamId(null);
          queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
            old.map(msg =>
              msg.id === data.messageId
                ? {
                    ...msg,
                    isLoading: false,
                    isStreaming: false,
                    canCancel: false,
                    hasError: true,
                    errorType: 'unknown',
                    onCancel: undefined,
                  }
                : msg
            )
          );
          break;
      }
    },
    [queryClient, projectId, handleCancelStream]
  );

  // Rest of component implementation...
};
```

### 4. Enhanced Input State Management

```typescript
// chat-input.tsx - Update for better streaming UX
export default function ChatInput({
  onSendMessage,
  isLoading,
  isStreaming = false, // New prop
  canCancel = false, // New prop
  onCancel, // New prop
  placeholder = "Type your message...",
  ...props
}: ChatInputProps) {
  const [input, setInput] = useState('');

  // Dynamic placeholder based on state
  const getPlaceholder = () => {
    if (isStreaming) return "AI is responding...";
    if (isLoading) return "Processing...";
    return placeholder;
  };

  return (
    <div className="relative">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={getPlaceholder()}
        disabled={isLoading || isStreaming}
        className={cn(
          "min-h-[80px] w-full resize-none rounded-md border border-input",
          "bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Add visual indicator for streaming
          isStreaming && "border-primary/50 bg-muted/20"
        )}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isStreaming) {
            e.preventDefault();
            if (input.trim()) {
              onSendMessage(input.trim());
              setInput('');
            }
          }
        }}
      />

      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        {/* Cancel button when streaming */}
        {isStreaming && canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            title="Cancel response"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Send button */}
        <button
          onClick={() => {
            if (input.trim() && !isLoading && !isStreaming) {
              onSendMessage(input.trim());
              setInput('');
            }
          }}
          disabled={!input.trim() || isLoading || isStreaming}
          className={cn(
            "p-2 rounded-md bg-primary text-primary-foreground",
            "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors"
          )}
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
```

### 5. Remove Old Streaming Components

```typescript
// ❌ REMOVE: Remove these streaming-related states and components
const [isStreaming, setIsStreaming] = useState(false);
const [streamingMessages, setStreamingMessages] = useState<ChatMessageProps[]>([]);
const [streamingError, setStreamingError] = useState<string | null>(null);

// ❌ REMOVE: Old streaming message display
{streamingMessages.map((message, index) => (
  <ChatMessage key={`streaming-${index}`} {...message} />
))}

// ❌ REMOVE: Old generating animation
{isStreaming && streamingMessages.length === 0 && (
  <div className="flex w-full max-w-[95%] mx-auto gap-3 p-4">
    {/* Old animation code */}
  </div>
)}
```

## Breaking Changes

1. **Remove Skeleton Loaders**: No more skeleton loading states
2. **New Props**: ChatMessage components need new streaming props
3. **Event Handling**: New streaming event types and handlers
4. **State Management**: Different approach to loading states
5. **Cancellation**: New cancellation flow and UI elements

## Benefits

1. **Real-time Feedback**: Users see content as it streams
2. **Better Control**: Cancel streams when needed
3. **Improved UX**: No more waiting for skeleton loaders
4. **Responsive Feel**: Immediate feedback on user actions
5. **Error Recovery**: Better handling of interruptions

## Testing Requirements

1. **Streaming Display**: Test real-time content updates
2. **Cancellation**: Test stream cancellation at different stages
3. **Error Handling**: Test various error scenarios
4. **Performance**: Ensure smooth streaming with large responses
5. **Accessibility**: Test keyboard navigation and screen readers

## Acceptance Criteria

- [ ] Remove all skeleton loading components
- [ ] Display streaming text in real-time as it arrives
- [ ] Add cancel button during active streams
- [ ] Stream cancellation works properly
- [ ] Messages appear immediately when created
- [ ] Loading states are unified and clear
- [ ] No performance issues with real-time updates
- [ ] Error states are handled gracefully
- [ ] Accessibility is maintained

## Estimated Effort

**Medium**: ~1-2 days

This ticket transforms the chat interface to provide immediate, real-time feedback following Dyad's proven UX patterns.
