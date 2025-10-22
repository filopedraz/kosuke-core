import type { ContentBlock } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

/**
 * Hook for sending messages in requirements gathering mode
 * Uses Claude Agent SDK via SSE endpoint
 */
export function useSendRequirementsMessage(projectId: number, sessionId: string) {
  const queryClient = useQueryClient();

  // Streaming state
  const [streamingState, setStreamingState] = useState({
    isStreaming: false,
    streamingContentBlocks: [] as ContentBlock[],
    streamingAssistantMessageId: null as number | null,
    streamAbortController: null as AbortController | null,
  });

  // Cancel stream function
  const cancelStream = useCallback(() => {
    if (streamingState.streamAbortController) {
      streamingState.streamAbortController.abort();
      setStreamingState({
        isStreaming: false,
        streamingContentBlocks: [],
        streamingAssistantMessageId: null,
        streamAbortController: null,
      });
    }
  }, [streamingState.streamAbortController]);

  // Mutation for sending requirements messages
  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const abortController = new AbortController();

      setStreamingState({
        isStreaming: true,
        streamingContentBlocks: [],
        streamingAssistantMessageId: null,
        streamAbortController: abortController,
      });

      // Call requirements chat SSE endpoint
      const response = await fetch(`/api/projects/${projectId}/requirements/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send requirements message');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const contentBlocks: ContentBlock[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'content_block') {
                // Add block to array
                const block: ContentBlock = {
                  id: `block-${Date.now()}-${contentBlocks.length}`,
                  index: contentBlocks.length,
                  type: data.block.type,
                  content: data.block.content || '',
                  status: 'streaming',
                  timestamp: new Date(),
                  toolName: data.block.name,
                };

                contentBlocks.push(block);

                // Update streaming state
                setStreamingState(prev => ({
                  ...prev,
                  streamingContentBlocks: [...contentBlocks],
                }));
              } else if (data.type === 'complete') {
                // Stream complete
                setStreamingState(prev => ({
                  ...prev,
                  streamingAssistantMessageId: data.messageId,
                }));

                // Mark all blocks as completed
                contentBlocks.forEach(block => {
                  block.status = 'completed';
                  if (block.type === 'thinking') {
                    block.isCollapsed = true;
                  }
                });

                setStreamingState(prev => ({
                  ...prev,
                  streamingContentBlocks: [...contentBlocks],
                }));

                break;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error');
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate messages query to refetch
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['chat-session-messages', projectId, sessionId],
        });

        // Also invalidate requirements docs to trigger refresh
        queryClient.invalidateQueries({
          queryKey: ['requirements-docs', projectId],
        });

        // Clear streaming state
        setStreamingState({
          isStreaming: false,
          streamingContentBlocks: [],
          streamingAssistantMessageId: null,
          streamAbortController: null,
        });
      }, 500);
    },
    onError: error => {
      console.error('Requirements message error:', error);
      setStreamingState({
        isStreaming: false,
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
