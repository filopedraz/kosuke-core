# Ticket 02: Placeholder Message Pattern

## Overview

Implement Dyad's placeholder message pattern where assistant messages are created immediately in the database with empty content and updated in real-time during streaming, instead of waiting for the complete response.

## Current State

- User sends message → saves to DB → waits for complete AI response → saves assistant message
- Frontend shows loading states and "thinking" animations
- No assistant message exists until stream completes
- Optimistic updates only on frontend, no database persistence

## Target State (Dyad Pattern)

- User sends message → saves to DB → **immediately create empty assistant message** → update content during streaming
- Assistant message exists from the start with incremental content updates
- Real-time database persistence of streaming content
- Frontend shows actual streaming text, not loading animations

## Implementation Details

### 1. Database Schema Considerations

Current schema supports this pattern - no changes needed:

```sql
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id INTEGER,
  content TEXT NOT NULL, -- Can start empty and be updated
  role VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  tokens_input INTEGER,
  tokens_output INTEGER,
  context_tokens INTEGER,
  metadata JSONB
);
```

### 2. Backend Implementation

```typescript
// lib/chat/placeholder-handler.ts
export async function createPlaceholderAssistantMessage(
  projectId: number,
  userId?: number
): Promise<{ id: number; timestamp: Date }> {
  const [assistantMessage] = await db
    .insert(chatMessages)
    .values({
      projectId,
      userId: null, // Assistant messages don't have userId
      content: '', // Empty content initially
      role: 'assistant',
      timestamp: new Date(),
      // Initialize token fields
      tokensInput: 0,
      tokensOutput: 0,
      contextTokens: 0,
    })
    .returning();

  return {
    id: assistantMessage.id,
    timestamp: assistantMessage.timestamp,
  };
}

export async function updateStreamingMessage(
  messageId: number,
  content: string,
  metadata?: {
    tokensInput?: number;
    tokensOutput?: number;
    contextTokens?: number;
  }
): Promise<void> {
  const updateData: any = { content };

  // Update token information if provided
  if (metadata) {
    if (metadata.tokensInput !== undefined) updateData.tokensInput = metadata.tokensInput;
    if (metadata.tokensOutput !== undefined) updateData.tokensOutput = metadata.tokensOutput;
    if (metadata.contextTokens !== undefined) updateData.contextTokens = metadata.contextTokens;
  }

  await db.update(chatMessages).set(updateData).where(eq(chatMessages.id, messageId));
}
```

### 3. Updated Streaming Flow

```typescript
// app/api/projects/[id]/chat/route.ts - Updated POST handler
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const projectId = parseInt(params.id);
  const { content, includeContext = false, contextFiles = [] } = await request.json();
  const session = await getSession();

  // 1. Save user message immediately
  const [userMessage] = await db
    .insert(chatMessages)
    .values({
      projectId,
      userId: session.user.id,
      content,
      role: 'user',
      timestamp: new Date(),
    })
    .returning();

  // 2. Create placeholder assistant message IMMEDIATELY
  const assistantMessage = await createPlaceholderAssistantMessage(projectId);

  // 3. Setup streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      let totalTokensInput = 0;
      let totalTokensOutput = 0;
      let contextSize = 0;

      try {
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
            content: '', // Empty initially
            role: 'assistant',
            timestamp: assistantMessage.timestamp,
            isLoading: true,
          },
        });
        controller.enqueue(encoder.encode(`data: ${initialEvent}\n\n`));

        // Start AI streaming
        const aiStream = await startAIStream({
          projectId,
          userMessage: content,
          includeContext,
          contextFiles,
        });

        // Process each chunk in real-time
        for await (const chunk of aiStream) {
          if (chunk.type === 'text') {
            fullResponse += chunk.content;

            // Update database immediately with current content
            await updateStreamingMessage(assistantMessage.id, fullResponse);

            // Send real-time update
            const updateEvent = JSON.stringify({
              type: 'message_chunk',
              messageId: assistantMessage.id,
              content: fullResponse,
              isStreaming: true,
            });
            controller.enqueue(encoder.encode(`data: ${updateEvent}\n\n`));
          }

          if (chunk.type === 'tokens') {
            totalTokensInput = chunk.tokensInput || 0;
            totalTokensOutput = chunk.tokensOutput || 0;
            contextSize = chunk.contextTokens || 0;

            // Update token information
            await updateStreamingMessage(assistantMessage.id, fullResponse, {
              tokensInput: totalTokensInput,
              tokensOutput: totalTokensOutput,
              contextTokens: contextSize,
            });

            // Send token update
            const tokenEvent = JSON.stringify({
              type: 'token_update',
              tokensInput: totalTokensInput,
              tokensOutput: totalTokensOutput,
              contextTokens: contextSize,
            });
            controller.enqueue(encoder.encode(`data: ${tokenEvent}\n\n`));
          }
        }

        // Stream completed successfully
        const completionEvent = JSON.stringify({
          type: 'stream_complete',
          messageId: assistantMessage.id,
          finalContent: fullResponse,
          isStreaming: false,
          tokensInput: totalTokensInput,
          tokensOutput: totalTokensOutput,
          contextTokens: contextSize,
        });
        controller.enqueue(encoder.encode(`data: ${completionEvent}\n\n`));
      } catch (error) {
        console.error('Streaming error:', error);

        // Save error state to database
        await updateStreamingMessage(
          assistantMessage.id,
          fullResponse + '\n\n[Error occurred during streaming]'
        );

        const errorEvent = JSON.stringify({
          type: 'stream_error',
          messageId: assistantMessage.id,
          error: error.message,
        });
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
      } finally {
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

### 4. Frontend Integration

```typescript
// chat-interface.tsx - Updated mutation handling
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

  onMutate: async variables => {
    // No optimistic updates needed - server handles everything
    // Just save for potential regeneration
    setLastUserMessage(variables.content);
    setLastMessageOptions(variables.options || null);
  },
});

const handleStreamingEvent = (data: any) => {
  switch (data.type) {
    case 'message_created':
      // Add both user and assistant messages immediately
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
          content: data.assistantMessage.content, // Empty initially
          role: 'assistant',
          timestamp: new Date(data.assistantMessage.timestamp),
          isLoading: true, // Mark as streaming
        },
      ]);
      break;

    case 'message_chunk':
      // Update assistant message content in real-time
      queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
        old.map(msg =>
          msg.id === data.messageId
            ? { ...msg, content: data.content, isLoading: data.isStreaming }
            : msg
        )
      );
      break;

    case 'token_update':
      // Update token usage
      setTokenUsage({
        tokensSent: data.tokensInput,
        tokensReceived: data.tokensOutput,
        contextSize: data.contextTokens,
      });
      break;

    case 'stream_complete':
      // Mark message as complete
      queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
        old.map(msg =>
          msg.id === data.messageId ? { ...msg, content: data.finalContent, isLoading: false } : msg
        )
      );
      break;

    case 'stream_error':
      // Handle errors
      queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) =>
        old.map(msg =>
          msg.id === data.messageId
            ? { ...msg, isLoading: false, hasError: true, errorType: 'unknown' }
            : msg
        )
      );
      break;
  }
};
```

### 5. Database Query Updates

```typescript
// Update fetchMessages to handle streaming messages correctly
const fetchMessages = async (projectId: number): Promise<ChatMessageProps[]> => {
  const response = await fetch(`/api/projects/${projectId}/chat`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chat history: ${response.statusText}`);
  }

  const data = await response.json();
  const apiMessages: ApiChatMessage[] = data.messages || [];

  return apiMessages
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role as 'user' | 'assistant' | 'system',
      timestamp: new Date(msg.timestamp),
      isLoading: false, // Never loading when fetched from DB
      actions:
        msg.actions?.map(op => ({
          ...op,
          timestamp: new Date(op.timestamp),
        })) || [],
      tokensInput: msg.tokensInput,
      tokensOutput: msg.tokensOutput,
      contextTokens: msg.contextTokens,
    }));
};
```

## Benefits of Placeholder Pattern

1. **Immediate Feedback**: Users see assistant message appear instantly
2. **Real-time Content**: Streaming text appears as it's generated
3. **Database Consistency**: Every message persisted with incremental updates
4. **Better UX**: No loading skeletons - actual content streams in
5. **Reliable State**: Messages always exist in DB, even if stream fails
6. **Token Tracking**: Real-time token updates during streaming

## Breaking Changes

1. **Message Creation Timing**: Assistant messages created before streaming starts
2. **Frontend Loading States**: Remove skeleton loaders, use isLoading flag instead
3. **Error Handling**: Messages can exist with partial content + error states
4. **API Response**: No longer returns complete message, uses streaming events

## Testing Requirements

1. **Database Tests**: Verify placeholder creation and incremental updates
2. **Streaming Tests**: Test real-time content updates
3. **Error Scenarios**: Partial content preservation on stream failure
4. **Performance Tests**: Database update frequency during streaming
5. **Race Condition Tests**: Multiple concurrent streams for same project

## Acceptance Criteria

- [ ] Assistant messages created immediately when user sends message
- [ ] Message content updates in real-time during streaming
- [ ] Database persists incremental content updates
- [ ] Frontend shows streaming text without skeleton loaders
- [ ] Token information updates in real-time
- [ ] Error states preserve partial content
- [ ] No loss of message data if stream fails
- [ ] Performance remains acceptable with frequent DB updates

## Estimated Effort

**Medium**: ~1-2 days

This ticket implements the core of Dyad's streaming pattern, enabling real-time message updates and better user experience during AI response generation.
