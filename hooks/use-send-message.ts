import type {
  ApiChatMessage,
  ChatMessageProps,
  ContentBlock,
  ErrorType,
  MessageOptions,
  StreamingEvent,
} from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

// Helper function to read file as data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Send message function with streaming support
const sendMessage = async (
  projectId: number,
  content: string,
  options?: MessageOptions,
  contentBlockCallback?: (contentBlocks: ContentBlock[]) => void,
  setAssistantIdCallback?: (id: number) => void,
  abortController?: AbortController
): Promise<{
  message: ApiChatMessage;
  success: boolean;
  fileUpdated?: boolean;
  totalTokensInput?: number;
  totalTokensOutput?: number;
  contextTokens?: number;
  error?: string;
  errorType?: ErrorType;
  expectingWebhookUpdate?: boolean;
}> => {
  try {
    // For image uploads, use FormData
    let requestBody: FormData | string;
    const requestHeaders: HeadersInit = {};

    if (options?.imageFile) {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('includeContext', options.includeContext ? 'true' : 'false');

      if (options.contextFiles && options.contextFiles.length) {
        formData.append('contextFiles', JSON.stringify(options.contextFiles));
      }

      formData.append('image', options.imageFile);
      requestBody = formData;

      // For image uploads, expect JSON response
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        body: requestBody,
        signal: abortController?.signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('LIMIT_REACHED');
        }
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      return await response.json();
    } else {
      // For text messages, use JSON and expect streaming response
      requestHeaders['Content-Type'] = 'application/json';
      requestBody = JSON.stringify({
        content,
        includeContext: options?.includeContext || false,
        contextFiles: options?.contextFiles || [],
      });

      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody,
        signal: abortController?.signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('LIMIT_REACHED');
        }

        const errorData = await response.json().catch(() => ({}));
        if (errorData && typeof errorData === 'object' && 'errorType' in errorData) {
          const error = new Error(errorData.error || 'Failed to send message');
          Object.assign(error, { errorType: errorData.errorType });
          throw error;
        }

        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      // For text messages, handle streaming response
      if (!response.body) {
        throw new Error('No response body');
      }

      // Extract assistant message ID from response headers for real-time updates
      const assistantMessageId = parseInt(response.headers.get('X-Assistant-Message-Id') || '0');

      // Notify callback with assistant message ID
      if (setAssistantIdCallback) {
        setAssistantIdCallback(assistantMessageId);
      }

      // Start streaming and update UI in real-time with action parsing
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Track streaming state and content blocks
      let isStreamActive = true;
      const contentBlocks: ContentBlock[] = [];

      while (isStreamActive) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const rawData = line.substring(6);

              // Handle [DONE] marker
              if (rawData === '[DONE]') {
                isStreamActive = false;
                break;
              }

              const data: StreamingEvent = JSON.parse(rawData);

              // Handle content block lifecycle events
              if (data.type === 'content_block_start') {
                // Create new sequential content block
                const newBlock: ContentBlock = {
                  id: `block-${assistantMessageId}-${Date.now()}-${contentBlocks.length}`,
                  index: contentBlocks.length,
                  type: 'text', // Default, will be updated based on deltas
                  content: '',
                  status: 'streaming',
                  timestamp: new Date(),
                };

                // Always append sequentially
                contentBlocks.push(newBlock);

                // Notify callback
                if (contentBlockCallback) {
                  contentBlockCallback([...contentBlocks]);
                }
              } else if (data.type === 'content_block_delta') {
                // Find the last streaming block that matches the content type
                let targetBlock: ContentBlock | null = null;

                if (data.delta_type === 'thinking_delta') {
                  // Find last streaming thinking block or create new one
                  for (let i = contentBlocks.length - 1; i >= 0; i--) {
                    if (
                      contentBlocks[i].type === 'thinking' &&
                      contentBlocks[i].status === 'streaming'
                    ) {
                      targetBlock = contentBlocks[i];
                      break;
                    }
                  }

                  if (!targetBlock) {
                    // Create new thinking block if none exists
                    targetBlock = {
                      id: `thinking-${assistantMessageId}-${Date.now()}`,
                      index: contentBlocks.length,
                      type: 'thinking',
                      content: '',
                      status: 'streaming',
                      timestamp: new Date(),
                    };
                    contentBlocks.push(targetBlock);
                  }

                  if (data.thinking) {
                    targetBlock.content += data.thinking;
                  }
                } else if (data.delta_type === 'text_delta') {
                  // Find last streaming text block or create new one
                  for (let i = contentBlocks.length - 1; i >= 0; i--) {
                    if (
                      contentBlocks[i].type === 'text' &&
                      contentBlocks[i].status === 'streaming'
                    ) {
                      targetBlock = contentBlocks[i];
                      break;
                    }
                  }

                  if (!targetBlock) {
                    // Create new text block if none exists
                    targetBlock = {
                      id: `text-${assistantMessageId}-${Date.now()}`,
                      index: contentBlocks.length,
                      type: 'text',
                      content: '',
                      status: 'streaming',
                      timestamp: new Date(),
                    };
                    contentBlocks.push(targetBlock);
                  }

                  if (data.text) {
                    targetBlock.content += data.text;
                  }
                }

                // Notify callback
                if (contentBlockCallback) {
                  contentBlockCallback([...contentBlocks]);
                }
              } else if (data.type === 'content_block_stop') {
                // Find and finalize the last streaming block
                let lastStreamingBlock: ContentBlock | null = null;
                for (let i = contentBlocks.length - 1; i >= 0; i--) {
                  if (contentBlocks[i].status === 'streaming') {
                    lastStreamingBlock = contentBlocks[i];
                    break;
                  }
                }

                if (lastStreamingBlock) {
                  // Finalize content block
                  lastStreamingBlock.status = 'completed';

                  // Auto-collapse thinking blocks immediately
                  if (lastStreamingBlock.type === 'thinking') {
                    lastStreamingBlock.isCollapsed = true;
                  }

                  // Notify callback
                  if (contentBlockCallback) {
                    contentBlockCallback([...contentBlocks]);
                  }
                }
              } else if (data.type === 'tool_start') {
                // Create tool content block inline
                if (data.tool_name) {
                  const toolBlock: ContentBlock = {
                    id: `tool-${assistantMessageId}-${data.tool_name}-${Date.now()}`,
                    index: contentBlocks.length,
                    type: 'tool',
                    content: `Executing ${data.tool_name}...`,
                    status: 'streaming',
                    timestamp: new Date(),
                    toolName: data.tool_name,
                    toolInput: data.tool_input, // Include tool input for file path extraction
                  };

                  contentBlocks.push(toolBlock);

                  // Notify callback
                  if (contentBlockCallback) {
                    contentBlockCallback([...contentBlocks]);
                  }
                }
              } else if (data.type === 'tool_complete') {
                // Find and finalize the last streaming tool with matching name
                if (data.tool_name) {
                  let toolBlock: ContentBlock | null = null;
                  for (let i = contentBlocks.length - 1; i >= 0; i--) {
                    if (
                      contentBlocks[i].type === 'tool' &&
                      contentBlocks[i].toolName === data.tool_name &&
                      contentBlocks[i].status === 'streaming'
                    ) {
                      toolBlock = contentBlocks[i];
                      break;
                    }
                  }

                  if (toolBlock) {
                    toolBlock.status = 'completed';
                    toolBlock.toolResult = data.result || 'Tool completed successfully';

                    // Notify callback
                    if (contentBlockCallback) {
                      contentBlockCallback([...contentBlocks]);
                    }
                  }

                  // Special handling for task_completed is handled by the tool result
                }
              } else if (data.type === 'task_summary') {
                // Add task summary as final content block
                if (data.summary) {
                  const summaryBlock: ContentBlock = {
                    id: `summary-${assistantMessageId}`,
                    index: contentBlocks.length,
                    type: 'text',
                    content: `**Task Summary:**\n${data.summary}`,
                    status: 'completed',
                    timestamp: new Date(),
                  };

                  contentBlocks.push(summaryBlock);

                  // Notify callback
                  if (contentBlockCallback) {
                    contentBlockCallback([...contentBlocks]);
                  }
                }
              } else if (data.type === 'message_complete') {
                // Handle message completion
                isStreamActive = false;
                break;
              } else if (data.type === 'error') {
                // Handle errors
                console.error('❌ Streaming error');
                isStreamActive = false;
                throw new Error('Streaming error');
              } else if (data.type === 'completed') {
                // Legacy completion handling
                isStreamActive = false;
                break;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }

      // Combine all content blocks for final message storage
      let finalContent = '';
      for (const block of contentBlocks) {
        if (block.type === 'thinking') {
          finalContent += `<thinking>\n${block.content}\n</thinking>\n\n`;
        } else if (block.type === 'text') {
          finalContent += block.content + '\n\n';
        } else if (block.type === 'tool' && block.toolResult) {
          // Include tool results in final content for context
          finalContent += `[Tool: ${block.toolName}]\n${block.toolResult}\n\n`;
        }
      }

      // Mark that we're expecting a webhook update

      // Return success response with assistant message ID
      return {
        message: {
          id: assistantMessageId,
          content: finalContent.trim(),
          role: 'assistant',
          timestamp: new Date(),
        } as ApiChatMessage,
        success: true,
        expectingWebhookUpdate: true,
      };
    }
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

// Hook for sending messages with streaming support
export function useSendMessage(projectId: number) {
  const queryClient = useQueryClient();

  // Streaming state (minimal React state for real-time updates)
  const [streamingState, setStreamingState] = useState({
    isStreaming: false,
    expectingWebhookUpdate: false,
    streamingContentBlocks: [] as ContentBlock[],
    streamingAssistantMessageId: null as number | null,
    streamAbortController: null as AbortController | null,
  });

  // Function to cancel ongoing stream
  const cancelStream = useCallback(() => {
    if (streamingState.streamAbortController) {
      streamingState.streamAbortController.abort();
      setStreamingState({
        isStreaming: false,
        expectingWebhookUpdate: false,
        streamingContentBlocks: [],
        streamingAssistantMessageId: null,
        streamAbortController: null,
      });
    }
  }, [streamingState.streamAbortController]);

  // Mutation for sending messages
  const mutation = useMutation({
    mutationFn: (args: { content: string; options?: MessageOptions }) => {
      // Set up streaming state and callback
      const abortController = new AbortController();
      setStreamingState(prev => ({
        ...prev,
        isStreaming: true,
        expectingWebhookUpdate: false,
        streamingContentBlocks: [],
        streamAbortController: abortController,
      }));

      // Create content block callback for real-time updates
      const contentBlockCallback = (contentBlocks: ContentBlock[]) => {
        setStreamingState(prev => ({
          ...prev,
          streamingContentBlocks: contentBlocks,
        }));
      };

      // Create assistant ID callback
      const setAssistantIdCallback = (id: number) => {
        setStreamingState(prev => ({
          ...prev,
          streamingAssistantMessageId: id,
        }));
      };

      return sendMessage(
        projectId,
        args.content,
        args.options,
        contentBlockCallback,
        setAssistantIdCallback,
        abortController
      );
    },
    onMutate: async newMessage => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', projectId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', projectId]);

      // Create optimistic content that includes image information if present
      const optimisticContent = newMessage.content;

      // Optimistically update to the new value (just add user message)
      queryClient.setQueryData(['messages', projectId], (old: unknown) => {
        if (!old || typeof old !== 'object' || !('messages' in old)) return old;
        const typedOld = old as { messages: ChatMessageProps[] };

        const newUserMessage: ChatMessageProps = {
          id: Date.now(),
          content: optimisticContent,
          role: 'user',
          timestamp: new Date(),
          isLoading: false,
        };

        return {
          ...typedOld,
          messages: [...typedOld.messages, newUserMessage],
        };
      });

      // If there's an image, generate its data URL and update the optimistic message
      if (newMessage.options?.imageFile) {
        const file = newMessage.options.imageFile;
        try {
          const dataUrl = await readFileAsDataURL(file);
          const imageMarkdown = `[Attached Image](${dataUrl})`;

          // Update the optimistic content with the image markdown
          const updatedOptimisticContent = newMessage.content.trim()
            ? `${newMessage.content}\n\n${imageMarkdown}`
            : imageMarkdown;

          // Update the query data again with the image included
          queryClient.setQueryData(['messages', projectId], (old: unknown) => {
            if (!old || typeof old !== 'object' || !('messages' in old)) return old;
            const typedOld = old as { messages: ChatMessageProps[] };

            const updatedMessages = [...typedOld.messages];
            const lastMessageIndex = updatedMessages.length - 1;

            if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'user') {
              updatedMessages[lastMessageIndex] = {
                ...updatedMessages[lastMessageIndex],
                content: updatedOptimisticContent,
              };
            }

            return {
              ...typedOld,
              messages: updatedMessages,
            };
          });
        } catch (error) {
          console.error('Error creating data URL for optimistic image:', error);
        }
      }

      // Return a context object with the snapshot
      return { previousMessages };
    },
    onError: (error, _, context) => {
      // If there's an error, roll back to the previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', projectId], context.previousMessages);
      }
    },
    onSuccess: data => {
      // If request contains fileUpdated flag, update preview
      if (data.fileUpdated) {
        const fileUpdatedEvent = new CustomEvent('file-updated', {
          detail: { projectId },
        });
        window.dispatchEvent(fileUpdatedEvent);
      }

      // If we're expecting a webhook update, set the flag and delay invalidation
      if ('expectingWebhookUpdate' in data && data.expectingWebhookUpdate) {
        setStreamingState(prev => ({
          ...prev,
          expectingWebhookUpdate: true,
        }));

        // Start a timer to stop expecting webhook updates after a reasonable time
        setTimeout(() => {
          setStreamingState(prev => ({
            ...prev,
            expectingWebhookUpdate: false,
          }));
        }, 10000); // 10 second timeout
      } else {
        // Immediate invalidation for non-streaming messages (like image uploads)
        queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
      }
    },
    onSettled: () => {
      // Add a delay before invalidating queries to allow webhook to save data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
      }, 2000); // 2 second delay to allow webhook to complete

      // Clean up streaming state
      setStreamingState({
        isStreaming: false,
        expectingWebhookUpdate: false,
        streamingContentBlocks: [],
        streamingAssistantMessageId: null,
        streamAbortController: null,
      });
    },
  });

  return {
    sendMessage: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    ...streamingState,
    cancelStream,
  };
}
