# Ticket 05: Stream Cancellation & Resource Management

## Overview

Implement robust stream cancellation functionality and comprehensive resource management following Dyad's approach, including abort controllers, partial response saving, memory cleanup, and graceful error handling.

## Current State

- No stream cancellation capability
- Limited resource cleanup
- Potential memory leaks with long-running streams
- Basic error handling without recovery
- No partial response preservation

## Target State (Dyad Approach)

- Full stream cancellation with abort controllers
- Comprehensive resource management and cleanup
- Partial response saving when streams are interrupted
- Memory management for concurrent streams
- Graceful error recovery and user feedback

## Implementation Details

### 1. Stream Management Infrastructure

```typescript
// lib/streaming/stream-manager.ts - Central stream management
export class StreamManager {
  private activeStreams = new Map<number, AbortController>();
  private partialResponses = new Map<number, string>();
  private streamMetadata = new Map<number, StreamMetadata>();

  // Create new stream with tracking
  public createStream(messageId: number): AbortController {
    // Cancel existing stream for this message if any
    this.cancelStream(messageId);

    const controller = new AbortController();
    this.activeStreams.set(messageId, controller);
    this.partialResponses.set(messageId, '');
    this.streamMetadata.set(messageId, {
      messageId,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      chunkCount: 0,
    });

    // Auto-cleanup after timeout (prevent memory leaks)
    setTimeout(() => {
      if (this.activeStreams.has(messageId)) {
        console.warn(`Stream ${messageId} auto-cleanup after timeout`);
        this.cleanupStream(messageId);
      }
    }, 300000); // 5 minutes timeout

    return controller;
  }

  // Cancel specific stream
  public cancelStream(messageId: number): boolean {
    const controller = this.activeStreams.get(messageId);
    if (controller) {
      controller.abort();
      this.cleanupStream(messageId);
      return true;
    }
    return false;
  }

  // Cancel all active streams
  public cancelAllStreams(): void {
    const activeMessageIds = Array.from(this.activeStreams.keys());
    activeMessageIds.forEach(messageId => this.cancelStream(messageId));
  }

  // Update partial response
  public updatePartialResponse(messageId: number, content: string): void {
    this.partialResponses.set(messageId, content);
    const metadata = this.streamMetadata.get(messageId);
    if (metadata) {
      metadata.lastUpdate = Date.now();
      metadata.chunkCount += 1;
    }
  }

  // Get partial response
  public getPartialResponse(messageId: number): string | undefined {
    return this.partialResponses.get(messageId);
  }

  // Check if stream is active
  public isStreamActive(messageId: number): boolean {
    return this.activeStreams.has(messageId);
  }

  // Get stream statistics
  public getStreamStats(messageId: number): StreamMetadata | undefined {
    return this.streamMetadata.get(messageId);
  }

  // Clean up stream resources
  private cleanupStream(messageId: number): void {
    this.activeStreams.delete(messageId);
    this.partialResponses.delete(messageId);
    this.streamMetadata.delete(messageId);
  }

  // Get active stream count
  public getActiveStreamCount(): number {
    return this.activeStreams.size;
  }
}

export interface StreamMetadata {
  messageId: number;
  startTime: number;
  lastUpdate: number;
  chunkCount: number;
}

// Singleton instance
export const streamManager = new StreamManager();
```

### 2. Enhanced Streaming Endpoint with Cancellation

```typescript
// app/api/projects/[id]/chat/route.ts - Enhanced with cancellation support
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const projectId = parseInt(params.id);
  const { content, includeContext = false, contextFiles = [] } = await request.json();
  const session = await getSession();

  // Create placeholder assistant message
  const assistantMessage = await createPlaceholderAssistantMessage(projectId);

  // Create managed stream with cancellation support
  const controller = streamManager.createStream(assistantMessage.id);

  // Setup streaming response with cancellation handling
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(streamController) {
      let fullResponse = '';

      try {
        // Setup abort handling
        controller.signal.addEventListener('abort', () => {
          console.log(`Stream ${assistantMessage.id} cancelled by user`);

          // Save partial response
          const partialContent = streamManager.getPartialResponse(assistantMessage.id);
          if (partialContent) {
            const cancelledContent = partialContent + '\n\n*[Response cancelled by user]*';

            // Update database with partial response
            updateStreamingMessage(assistantMessage.id, cancelledContent).catch(error =>
              console.error('Error saving cancelled message:', error)
            );

            // Send cancellation event
            const cancelEvent = JSON.stringify({
              type: 'stream_cancelled',
              messageId: assistantMessage.id,
              partialContent: cancelledContent,
            });
            streamController.enqueue(encoder.encode(`data: ${cancelEvent}\n\n`));
          }

          streamController.close();
        });

        // Send initial message creation event
        const initialEvent = JSON.stringify({
          type: 'message_created',
          userMessage: {
            id: userMessage.id,
            content: userMessage.content,
            role: 'user',
            timestamp: userMessage.timestamp,
          },
          assistantMessage: {
            id: assistantMessage.id,
            content: '',
            role: 'assistant',
            timestamp: assistantMessage.timestamp,
            isLoading: true,
            canCancel: true,
          },
        });
        streamController.enqueue(encoder.encode(`data: ${initialEvent}\n\n`));

        // Start AI streaming with cancellation support
        const aiStream = await startAIStream({
          projectId,
          userMessage: content,
          includeContext,
          contextFiles,
          signal: controller.signal, // Pass abort signal
        });

        // Process stream with cancellation checks
        for await (const chunk of aiStream) {
          // Check for cancellation before processing each chunk
          if (controller.signal.aborted) {
            console.log('Stream processing aborted');
            break;
          }

          if (chunk.type === 'text') {
            fullResponse += chunk.content;

            // Update partial response tracking
            streamManager.updatePartialResponse(assistantMessage.id, fullResponse);

            // Update database with current content
            await updateStreamingMessage(assistantMessage.id, fullResponse);

            // Send real-time update
            const updateEvent = JSON.stringify({
              type: 'message_chunk',
              messageId: assistantMessage.id,
              content: fullResponse,
              isStreaming: true,
              canCancel: true,
            });
            streamController.enqueue(encoder.encode(`data: ${updateEvent}\n\n`));
          }

          // Add small delay to allow cancellation to be processed
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Check if we completed without cancellation
        if (!controller.signal.aborted) {
          // Stream completed successfully
          const completionEvent = JSON.stringify({
            type: 'stream_complete',
            messageId: assistantMessage.id,
            finalContent: fullResponse,
            isStreaming: false,
            canCancel: false,
          });
          streamController.enqueue(encoder.encode(`data: ${completionEvent}\n\n`));
        }
      } catch (error) {
        console.error('Streaming error:', error);

        // Handle different error types
        let errorType = 'unknown';
        if (error.name === 'AbortError' || controller.signal.aborted) {
          errorType = 'cancelled';
        } else if (error.message.includes('timeout')) {
          errorType = 'timeout';
        }

        // Save error state with partial content
        const partialContent = streamManager.getPartialResponse(assistantMessage.id);
        const errorContent = partialContent
          ? partialContent + `\n\n*[Error: ${error.message}]*`
          : `*[Error: ${error.message}]*`;

        await updateStreamingMessage(assistantMessage.id, errorContent);

        const errorEvent = JSON.stringify({
          type: 'stream_error',
          messageId: assistantMessage.id,
          error: error.message,
          errorType,
          partialContent: errorContent,
        });
        streamController.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
      } finally {
        // Always clean up resources
        streamManager.cleanupStream(assistantMessage.id);
        streamController.close();
      }
    },

    // Handle stream cancellation from client side
    cancel() {
      console.log('Stream cancelled from client');
      streamManager.cancelStream(assistantMessage.id);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### 3. Enhanced AI Stream Function with Cancellation

```typescript
// lib/ai/stream-handler.ts - AI streaming with cancellation support
export async function startAIStream({
  projectId,
  userMessage,
  includeContext,
  contextFiles,
  signal, // AbortSignal for cancellation
}: {
  projectId: number;
  userMessage: string;
  includeContext: boolean;
  contextFiles: string[];
  signal?: AbortSignal;
}) {
  // Create async generator that respects cancellation
  return (async function* () {
    try {
      // Simulate AI streaming with cancellation checks
      const response = await fetch('https://ai-api.example.com/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: includeContext,
          files: contextFiles,
        }),
        signal, // Pass abort signal to AI API
      });

      if (!response.body) {
        throw new Error('No response body from AI');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        // Check for cancellation before each read
        if (signal?.aborted) {
          throw new Error('Stream cancelled');
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              // Check for cancellation before yielding
              if (signal?.aborted) {
                throw new Error('Stream cancelled');
              }

              yield {
                type: 'text',
                content: data.content,
              };
            } catch (parseError) {
              console.warn('Failed to parse AI stream data:', line);
            }
          }
        }
      }
    } catch (error) {
      if (signal?.aborted || error.name === 'AbortError') {
        console.log('AI stream cancelled');
        throw new Error('Stream cancelled');
      }
      throw error;
    }
  })();
}
```

### 4. Frontend Cancellation Integration

```typescript
// chat-interface.tsx - Enhanced with cancellation management
const ChatInterface = ({ projectId, initialMessages = [] }: ChatInterfaceProps) => {
  // Cancellation state
  const [activeCancellations, setActiveCancellations] = useState<Set<number>>(new Set());

  // Enhanced mutation with cancellation
  const { mutate, isPending: isSending } = useMutation({
    mutationFn: async (args: { content: string; options?: MessageOptions }) => {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: args.content,
          includeContext: args.options?.includeContext || false,
          contextFiles: args.options?.contextFiles || [],
        }),
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
    },
  });

  // Cancel stream function
  const cancelStream = useCallback(
    async (messageId: number) => {
      setActiveCancellations(prev => new Set([...prev, messageId]));

      try {
        // Call backend cancellation endpoint
        const response = await fetch(`/api/projects/${projectId}/chat/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId }),
        });

        if (!response.ok) {
          throw new Error(`Cancellation failed: ${response.statusText}`);
        }

        console.log(`Stream ${messageId} cancellation requested`);
      } catch (error) {
        console.error('Error cancelling stream:', error);

        // Remove from active cancellations on error
        setActiveCancellations(prev => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [projectId]
  );

  // Enhanced streaming event handler
  const handleStreamingEvent = useCallback(
    (data: any) => {
      switch (data.type) {
        case 'message_created':
          // Add messages with cancel capability
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
              onCancel: () => cancelStream(data.assistantMessage.id),
            },
          ]);
          break;

        case 'stream_cancelled':
          // Handle cancellation completion
          setActiveCancellations(prev => {
            const next = new Set(prev);
            next.delete(data.messageId);
            return next;
          });

          queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
            old.map(msg =>
              msg.id === data.messageId
                ? {
                    ...msg,
                    content: data.partialContent,
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
          // Handle stream errors
          setActiveCancellations(prev => {
            const next = new Set(prev);
            next.delete(data.messageId);
            return next;
          });

          queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
            old.map(msg =>
              msg.id === data.messageId
                ? {
                    ...msg,
                    content: data.partialContent || msg.content,
                    isLoading: false,
                    isStreaming: false,
                    canCancel: false,
                    hasError: true,
                    errorType: data.errorType || 'unknown',
                    onCancel: undefined,
                  }
                : msg
            )
          );
          break;

        // ... other event types
      }
    },
    [queryClient, projectId, cancelStream]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any active streams when component unmounts
      activeCancellations.forEach(messageId => {
        cancelStream(messageId);
      });
    };
  }, []);

  // Rest of component...
};
```

### 5. Backend Cancellation Endpoint

```typescript
// app/api/projects/[id]/chat/cancel/route.ts - Stream cancellation endpoint
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = parseInt(params.id);
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Cancel the stream using stream manager
    const cancelled = streamManager.cancelStream(messageId);

    if (cancelled) {
      console.log(`Successfully cancelled stream for message ${messageId}`);

      // Get partial response if available
      const partialContent = streamManager.getPartialResponse(messageId);
      if (partialContent) {
        // Update database with cancelled state
        await updateStreamingMessage(
          messageId,
          partialContent + '\n\n*[Response cancelled by user]*'
        );
      }

      return NextResponse.json({
        success: true,
        messageId,
        message: 'Stream cancelled successfully',
      });
    } else {
      return NextResponse.json({ error: 'Stream not found or already completed' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error cancelling stream:', error);
    return NextResponse.json({ error: 'Failed to cancel stream' }, { status: 500 });
  }
}
```

### 6. Memory Management and Cleanup

```typescript
// lib/streaming/memory-manager.ts - Memory and resource management
export class MemoryManager {
  private cleanupInterval: NodeJS.Timeout;
  private maxStreamAge = 300000; // 5 minutes
  private maxConcurrentStreams = 10;

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60000);
  }

  // Cleanup old and stale streams
  private performCleanup(): void {
    const now = Date.now();
    const activeStreams = streamManager.getActiveStreamCount();

    console.log(`Memory cleanup: ${activeStreams} active streams`);

    // Check for streams that are too old
    for (const [messageId, metadata] of streamManager.getStreamMetadata()) {
      const age = now - metadata.startTime;
      const timeSinceUpdate = now - metadata.lastUpdate;

      // Cancel streams that are too old or stale
      if (age > this.maxStreamAge || timeSinceUpdate > 120000) {
        // 2 minutes stale
        console.warn(
          `Cleaning up stale stream ${messageId} (age: ${age}ms, stale: ${timeSinceUpdate}ms)`
        );
        streamManager.cancelStream(messageId);
      }
    }

    // If too many concurrent streams, cancel oldest ones
    if (activeStreams > this.maxConcurrentStreams) {
      const streamsToCancel = activeStreams - this.maxConcurrentStreams;
      console.warn(
        `Too many concurrent streams (${activeStreams}), cancelling ${streamsToCancel} oldest`
      );

      // Implementation would cancel oldest streams
      this.cancelOldestStreams(streamsToCancel);
    }

    // Force garbage collection if available (Node.js)
    if (global.gc) {
      global.gc();
    }
  }

  private cancelOldestStreams(count: number): void {
    // Implementation to cancel oldest streams based on start time
    // This would integrate with streamManager to get stream metadata
  }

  // Manual cleanup trigger
  public forceCleanup(): void {
    this.performCleanup();
  }

  // Shutdown cleanup
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    streamManager.cancelAllStreams();
  }
}

export const memoryManager = new MemoryManager();
```

## Breaking Changes

1. **Stream Management**: New stream tracking and management system
2. **Cancellation API**: New cancellation endpoints and handling
3. **Error Handling**: Enhanced error types and recovery
4. **Resource Management**: Automatic cleanup and memory management
5. **Component Props**: New cancellation-related props and callbacks

## Benefits

1. **User Control**: Users can cancel long-running streams
2. **Resource Efficiency**: Prevent memory leaks and resource waste
3. **Better UX**: Immediate response to user cancellation requests
4. **Reliability**: Robust error handling and recovery
5. **Performance**: Automatic cleanup of stale resources

## Testing Requirements

1. **Cancellation Flow**: Test stream cancellation at various stages
2. **Partial Response**: Test partial response saving and display
3. **Memory Management**: Test resource cleanup and leak prevention
4. **Error Recovery**: Test various error scenarios and recovery
5. **Concurrent Streams**: Test multiple simultaneous streams

## Acceptance Criteria

- [ ] Users can cancel active streams with immediate feedback
- [ ] Partial responses are preserved when streams are cancelled
- [ ] Memory usage remains stable during long sessions
- [ ] No resource leaks with concurrent or cancelled streams
- [ ] Error handling covers all cancellation scenarios
- [ ] Automatic cleanup prevents stale stream accumulation
- [ ] Performance remains good with frequent cancellations
- [ ] Database consistency maintained during cancellations

## Estimated Effort

**Medium-High**: ~2-3 days

This ticket implements the robust stream management foundation that makes the chat system reliable and user-friendly, following Dyad's proven patterns for handling stream lifecycles and resource management.
