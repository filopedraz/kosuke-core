# Ticket 01: Unified Streaming Endpoint

## Overview

Consolidate `/api/projects/[id]/chat`, `/api/projects/[id]/chat/stream`, and `/api/projects/[id]/chat/sse` into a single unified endpoint that handles both message persistence and real-time streaming following Dyad's architecture.

## Current State

- **GET `/api/projects/[id]/chat`**: Retrieves chat history
- **POST `/api/projects/[id]/chat`**: Saves user message, initiates processing
- **POST `/api/projects/[id]/chat/stream`**: Handles streaming processing
- **GET `/api/projects/[id]/chat/sse`**: Server-sent events for real-time updates

## Target State

- **GET `/api/projects/[id]/chat`**: Retrieves chat history (unchanged)
- **POST `/api/projects/[id]/chat`**: Unified endpoint that saves messages AND handles streaming in one flow
- Remove `/chat/stream` and `/chat/sse` endpoints entirely

## Implementation Details

### 1. New Unified Chat Endpoint Structure

```typescript
// app/api/projects/[id]/chat/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const projectId = parseInt(params.id);
  const body = await request.json();
  const { content, includeContext = false, contextFiles = [] } = body;

  // 1. Save user message immediately
  const userMessage = await db
    .insert(chatMessages)
    .values({
      projectId,
      userId: session.user.id,
      content,
      role: 'user',
      timestamp: new Date(),
    })
    .returning();

  // 2. Create placeholder assistant message
  const [assistantMessage] = await db
    .insert(chatMessages)
    .values({
      projectId,
      userId: null,
      content: '', // Empty content, will be updated during streaming
      role: 'assistant',
      timestamp: new Date(),
    })
    .returning();

  // 3. Setup streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Start streaming to AI and processing
        await processStreamingChat({
          projectId,
          userMessage: content,
          assistantMessageId: assistantMessage.id,
          controller,
          encoder,
          includeContext,
          contextFiles,
        });
      } catch (error) {
        // Send error and close stream
        const errorData = JSON.stringify({
          type: 'error',
          error: error.message,
          messageId: assistantMessage.id,
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
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

### 2. Streaming Processing Function

```typescript
// lib/streaming/chat-processor.ts
interface StreamingChatParams {
  projectId: number;
  userMessage: string;
  assistantMessageId: number;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  includeContext: boolean;
  contextFiles: string[];
}

export async function processStreamingChat({
  projectId,
  userMessage,
  assistantMessageId,
  controller,
  encoder,
  includeContext,
  contextFiles,
}: StreamingChatParams) {
  let fullResponse = '';
  let currentActions: Action[] = [];

  try {
    // Setup AI streaming
    const aiStream = await startAIStream({
      projectId,
      message: userMessage,
      includeContext,
      contextFiles,
    });

    // Process each chunk
    for await (const chunk of aiStream) {
      if (chunk.type === 'text') {
        fullResponse += chunk.content;

        // Update database immediately
        await db
          .update(chatMessages)
          .set({ content: fullResponse })
          .where(eq(chatMessages.id, assistantMessageId));

        // Send real-time update to client
        const updateData = JSON.stringify({
          type: 'message_update',
          messageId: assistantMessageId,
          content: fullResponse,
        });
        controller.enqueue(encoder.encode(`data: ${updateData}\n\n`));
      }

      if (chunk.type === 'action') {
        currentActions.push(chunk.action);

        // Save action to database
        await db.insert(actions).values({
          messageId: assistantMessageId,
          path: chunk.action.path,
          type: chunk.action.type,
          status: 'pending',
          timestamp: new Date(),
        });

        // Send action update to client
        const actionData = JSON.stringify({
          type: 'action_update',
          messageId: assistantMessageId,
          action: chunk.action,
        });
        controller.enqueue(encoder.encode(`data: ${actionData}\n\n`));
      }
    }

    // Stream completed successfully
    const completionData = JSON.stringify({
      type: 'stream_complete',
      messageId: assistantMessageId,
      totalActions: currentActions.length,
    });
    controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
  } catch (error) {
    // Handle streaming errors
    const errorData = JSON.stringify({
      type: 'stream_error',
      messageId: assistantMessageId,
      error: error.message,
    });
    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
  } finally {
    controller.close();
  }
}
```

### 3. Frontend Integration Updates

```typescript
// Updated sendMessage function in chat-interface.tsx
const sendMessage = async (
  projectId: number,
  content: string,
  options?: MessageOptions
): Promise<void> => {
  const response = await fetch(`/api/projects/${projectId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      includeContext: options?.includeContext || false,
      contextFiles: options?.contextFiles || [],
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
        handleStreamEvent(data);
      }
    }
  }
};

const handleStreamEvent = (data: any) => {
  switch (data.type) {
    case 'message_update':
      // Update message content in real-time
      queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[]) => {
        return old.map(msg =>
          msg.id === data.messageId ? { ...msg, content: data.content, isLoading: true } : msg
        );
      });
      break;

    case 'action_update':
      // Update actions in real-time
      queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[]) => {
        return old.map(msg =>
          msg.id === data.messageId
            ? { ...msg, actions: [...(msg.actions || []), data.action] }
            : msg
        );
      });
      break;

    case 'stream_complete':
      // Mark message as complete
      queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[]) => {
        return old.map(msg => (msg.id === data.messageId ? { ...msg, isLoading: false } : msg));
      });
      break;

    case 'stream_error':
      // Handle errors
      console.error('Stream error:', data.error);
      break;
  }
};
```

## Breaking Changes

### 1. Remove Old Endpoints

- Delete `app/api/projects/[id]/chat/stream/route.ts`
- Delete `app/api/projects/[id]/chat/sse/route.ts`

### 2. Update Frontend API Calls

- Remove `startStreamingProcessing` function
- Remove SSE event listeners
- Update `sendMessage` to use unified endpoint

### 3. Response Format Changes

- Old: Separate HTTP response + SSE events
- New: Single streaming response with structured events

## Benefits

1. **Simplified Architecture**: One endpoint handles everything
2. **Better Performance**: No need for multiple connections
3. **Improved Reliability**: Single connection reduces failure points
4. **Real-time Updates**: Immediate database updates during streaming
5. **Consistent Error Handling**: Unified error flow

## Testing Requirements

1. **Unit Tests**: Test streaming processor functions
2. **Integration Tests**: Test full chat flow end-to-end
3. **Error Scenarios**: Test network interruptions, AI failures
4. **Performance Tests**: Verify real-time update performance

## Acceptance Criteria

- [ ] Single POST endpoint handles both saving and streaming
- [ ] Real-time message content updates during streaming
- [ ] Real-time action updates during streaming
- [ ] Proper error handling and stream completion signals
- [ ] Remove old `/stream` and `/sse` endpoints
- [ ] Frontend successfully integrates with new unified endpoint
- [ ] No loss of functionality compared to current implementation
- [ ] Performance is equal or better than current approach

## Estimated Effort

**Medium-High**: ~2-3 days

This ticket establishes the foundation for all subsequent streaming improvements by creating a single, robust endpoint that follows Dyad's proven architecture pattern.
