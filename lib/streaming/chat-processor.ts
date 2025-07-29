import { db } from '@/lib/db/drizzle';
import { chatMessages } from '@/lib/db/schema';
import { countTokens } from '@/lib/llm/utils';
import type { StreamEvent, StreamingAction, StreamingChatParams } from '@/lib/types';
import { eq } from 'drizzle-orm';

export async function processStreamingChat({
  projectId,
  userMessage,
  assistantMessageId,
  controller,
  encoder,
  includeContext = false,
  contextFiles = [],
}: StreamingChatParams) {
  const currentActions: StreamingAction[] = [];

  // Mark unused parameters to avoid linter warnings
  void includeContext;
  void contextFiles;

  try {
    // Setup AI streaming by calling the Python FastAPI service
    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

    const response = await fetch(`${agentServiceUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        prompt: userMessage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Agent service failed: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body from agent service');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Process each chunk from the Python agent
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('✅ Agent streaming completed');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const rawData = line.substring(6);

            // Handle [DONE] marker
            if (rawData === '[DONE]') {
              break;
            }

            const data = JSON.parse(rawData);
            console.log('📡 Agent update:', data);

            // Send action updates directly to frontend for action cards
            if (
              data.type === 'thinking' ||
              data.type === 'read' ||
              data.type === 'create' ||
              data.type === 'edit' ||
              data.type === 'delete'
            ) {
              const action: StreamingAction = {
                type: data.type,
                path: data.file_path || '',
                status: (data.status || 'pending') as StreamingAction['status'],
                message: data.message || '',
              };

              currentActions.push(action);

              // Send action update to client
              const actionEvent: StreamEvent = {
                type: 'action_update',
                messageId: assistantMessageId,
                action,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(actionEvent)}\n\n`));
            }

            // Handle completion
            if (data.type === 'completed') {
              // Build final response content from completed actions
              const finalContent = data.message || 'Processing completed successfully';

              // Calculate final token counts
              const outputTokens = countTokens(finalContent);

              // Update final message with completion content and token count
              await db
                .update(chatMessages)
                .set({
                  content: finalContent,
                  tokensOutput: outputTokens,
                })
                .where(eq(chatMessages.id, assistantMessageId));

              // Send completion event
              const completionEvent: StreamEvent = {
                type: 'stream_complete',
                messageId: assistantMessageId,
                totalActions: currentActions.length,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionEvent)}\n\n`));
              break;
            }
          } catch (parseError) {
            console.warn('Failed to parse agent data:', parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming processing error:', error);

    // Update database with error message
    const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    await db
      .update(chatMessages)
      .set({ content: errorMessage })
      .where(eq(chatMessages.id, assistantMessageId));

    // Send error event to client
    const errorEvent: StreamEvent = {
      type: 'stream_error',
      messageId: assistantMessageId,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
  } finally {
    controller.close();
  }
}
