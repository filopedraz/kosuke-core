import type {
  Action,
  ApiChatMessage,
  ChatMessageProps,
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
  streamingCallback?: (content: string) => void,
  actionsCallback?: (actions: Action[]) => void,
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
}> => {
  try {
    console.log('💾 Sending message via unified endpoint');

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
      console.log(`📱 Assistant message ID for streaming updates: ${assistantMessageId}`);

      // Notify callback with assistant message ID
      if (setAssistantIdCallback) {
        setAssistantIdCallback(assistantMessageId);
      }

      // Start streaming and update UI in real-time with action parsing
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Track streaming state and actions
      let isStreamActive = true;
      let fullContent = '';
      const streamingActions: Action[] = [];

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
                console.log('✅ Streaming completed');
                break;
              }

              const data: StreamingEvent = JSON.parse(rawData);
              console.log('📡 Streaming update:', data);

              // Parse Python agent events into Action objects for real-time display
              if (data.type && data.file_path !== undefined && data.message && data.status) {
                // Convert Python agent event to Action object
                const action: Action = {
                  type: data.type as Action['type'],
                  path: data.file_path,
                  status: data.status as Action['status'],
                  timestamp: new Date(),
                  messageId: assistantMessageId,
                  content: data.message,
                };

                // Update actions array for real-time display
                const existingActionIndex = streamingActions.findIndex(
                  a => a.type === action.type && a.path === action.path
                );
                if (existingActionIndex >= 0) {
                  // Update existing action
                  streamingActions[existingActionIndex] = action;
                } else {
                  // Add new action
                  streamingActions.push(action);
                }

                console.log(
                  `🎯 Created Action: ${action.type} on ${action.path} - ${action.status}`
                );

                // Notify actions callback for real-time UI updates
                if (actionsCallback) {
                  actionsCallback([...streamingActions]);
                }

                // Accumulate content for display
                if (data.message) {
                  fullContent += data.message + '\n';
                }
              }

              // Handle completion
              if (data.type === 'completed') {
                isStreamActive = false;
                console.log('✅ Streaming completed');
                break;
              }

              // Call streaming callback for UI updates with accumulated content
              if (streamingCallback) {
                streamingCallback(fullContent);
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }

      // Return success response with assistant message ID and final actions
      return {
        message: {
          id: assistantMessageId,
          content: fullContent,
          role: 'assistant',
          timestamp: new Date(),
          actions: streamingActions,
        } as ApiChatMessage,
        success: true,
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
    streamingActions: [] as Action[],
    streamingContent: '',
    streamingAssistantMessageId: null as number | null,
    streamAbortController: null as AbortController | null,
  });

  // Function to cancel ongoing stream
  const cancelStream = useCallback(() => {
    if (streamingState.streamAbortController) {
      console.log('🛑 Cancelling stream...');
      streamingState.streamAbortController.abort();
      setStreamingState({
        isStreaming: false,
        streamingActions: [],
        streamingContent: '',
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
        streamingActions: [],
        streamingContent: '',
        streamAbortController: abortController,
      }));

      // Create streaming callback that updates real-time state
      const streamingCallback = (content: string) => {
        setStreamingState(prev => ({
          ...prev,
          streamingContent: content,
        }));
      };

      // Create actions callback for real-time action updates
      const actionsCallback = (actions: Action[]) => {
        setStreamingState(prev => ({
          ...prev,
          streamingActions: actions,
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
        streamingCallback,
        actionsCallback,
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
      queryClient.setQueryData(['messages', projectId], (old: any) => {
        if (!old) return old;

        const newUserMessage: ChatMessageProps = {
          id: Date.now(),
          content: optimisticContent,
          role: 'user',
          timestamp: new Date(),
          isLoading: false,
        };

        return {
          ...old,
          messages: [...old.messages, newUserMessage],
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
          queryClient.setQueryData(['messages', projectId], (old: any) => {
            if (!old) return old;

            const updatedMessages = [...old.messages];
            const lastMessageIndex = updatedMessages.length - 1;

            if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'user') {
              updatedMessages[lastMessageIndex] = {
                ...updatedMessages[lastMessageIndex],
                content: updatedOptimisticContent,
              };
            }

            return {
              ...old,
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

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
    },
    onSettled: () => {
      // Always invalidate when settled (success or error)
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] });

      // Clean up streaming state
      setStreamingState({
        isStreaming: false,
        streamingActions: [],
        streamingContent: '',
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
