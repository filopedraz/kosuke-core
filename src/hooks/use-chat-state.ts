import type { ChatMessageProps, ErrorType, MessageOptions } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

// Hook for managing chat error state and regeneration
export function useChatState(projectId: number, sessionId?: string | null) {
  const queryClient = useQueryClient();

  // Error state
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>('unknown');

  // Regeneration state
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [lastMessageOptions, setLastMessageOptions] = useState<MessageOptions | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Clear error state
  const clearError = useCallback(() => {
    setIsError(false);
    setErrorMessage('');
    setErrorType('unknown');
  }, []);

  // Set error state
  const setError = useCallback((message: string, type: ErrorType = 'unknown') => {
    setIsError(true);
    setErrorMessage(message);
    setErrorType(type);
  }, []);

  // Handle error from mutation
  const handleMutationError = useCallback((error: unknown) => {
    if (error instanceof Error && error.message === 'LIMIT_REACHED') {
      setErrorMessage('LIMIT_REACHED');
    } else {
      // Try to extract error type
      const errorType =
        error instanceof Error && 'errorType' in error
          ? (error as Error & { errorType: ErrorType }).errorType
          : 'unknown';
      setErrorType(errorType as ErrorType);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message');
    }
    setIsError(true);
  }, []);

  // Save last message for regeneration
  const saveLastMessage = useCallback((content: string, options?: MessageOptions) => {
    setLastUserMessage(content);
    setLastMessageOptions(options || null);
  }, []);

  // Regenerate last message
  const regenerateMessage = useCallback(
    async (sendMessageFn: (content: string, options?: MessageOptions) => Promise<void>) => {
      // Only regenerate if we have a last user message
      if (!lastUserMessage && !lastMessageOptions?.imageFile) {
        console.warn('Cannot regenerate: No previous message to resend');
        return;
      }

      // Ensure we have a sessionId for regeneration
      if (!sessionId) {
        console.warn('Cannot regenerate: No session ID provided');
        return;
      }

      setIsRegenerating(true);

      try {
        // Get current messages from TanStack Query cache (session-specific)
        const currentData = queryClient.getQueryData([
          'chat-session-messages',
          projectId,
          sessionId,
        ]) as { messages: ChatMessageProps[] } | undefined;

        if (currentData) {
          // Find and remove all messages after the last user message
          const messages = currentData.messages;
          const lastUserMessageIndex = [...messages]
            .reverse()
            .findIndex(msg => msg.role === 'user');

          if (lastUserMessageIndex >= 0) {
            const userMessageIndex = messages.length - 1 - lastUserMessageIndex;
            const updatedMessages = messages.slice(0, userMessageIndex + 1);

            // Optimistically update messages to remove any failed assistant responses
            queryClient.setQueryData(['chat-session-messages', projectId, sessionId], {
              ...currentData,
              messages: updatedMessages,
            });

            // Clear error state
            clearError();

            // Re-send the last user message
            await sendMessageFn(lastUserMessage, lastMessageOptions || undefined);
          }
        }
      } catch (error) {
        console.error('Error during regeneration:', error);
        // Keep error state but update the message
        setErrorMessage('Failed to regenerate response');
        setIsError(true);
      } finally {
        setIsRegenerating(false);
      }
    },
    [lastUserMessage, lastMessageOptions, projectId, sessionId, queryClient, clearError]
  );

  // Get error message based on error type
  const getErrorMessage = useCallback((type: ErrorType): string => {
    switch (type) {
      case 'timeout':
        return 'The request timed out';
      case 'parsing':
        return 'Error processing AI response';
      case 'processing':
        return 'Error processing your request';
      case 'unknown':
      default:
        return 'There was an issue with the chat service';
    }
  }, []);

  // Reset chat messages
  const resetChat = useCallback(() => {
    if (sessionId) {
      queryClient.invalidateQueries({ queryKey: ['chat-session-messages', projectId, sessionId] });
    }
    clearError();
    setLastUserMessage('');
    setLastMessageOptions(null);
  }, [projectId, sessionId, queryClient, clearError]);

  return {
    // Error state
    isError,
    errorMessage,
    errorType,
    setError,
    clearError,
    handleMutationError,
    getErrorMessage,

    // Regeneration state
    lastUserMessage,
    lastMessageOptions,
    isRegenerating,
    saveLastMessage,
    regenerateMessage,

    // Utility functions
    resetChat,
  };
}
