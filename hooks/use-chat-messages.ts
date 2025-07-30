import type { ApiChatMessage, ChatMessageProps, ErrorType, TokenUsageMetrics } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

interface FetchMessagesResult {
  messages: ChatMessageProps[];
  tokenUsage: TokenUsageMetrics;
}

// API function to fetch messages
const fetchMessages = async (projectId: number): Promise<FetchMessagesResult> => {
  const response = await fetch(`/api/projects/${projectId}/chat`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chat history: ${response.statusText}`);
  }

  const data = await response.json();
  const apiMessages: ApiChatMessage[] = data.messages || [];

  // Enhanced debug logging
  console.log('🔍 Full API response data:', data);
  console.log('🔍 Messages in response:', data.messages?.length || 0);

  if (data.messages && Array.isArray(data.messages)) {
    data.messages.forEach((m: ApiChatMessage, index: number) => {
      console.log(`🔍 Message ${index + 1} (ID: ${m.id}, role: ${m.role}):`);
      console.log(`  - Content preview: "${m.content.substring(0, 50)}..."`);

      console.log(
        `  - Tokens - Input: ${m.tokensInput}, Output: ${m.tokensOutput}, Context: ${m.contextTokens}`
      );
    });
  }

  // Convert API messages to ChatMessageProps
  const messages = apiMessages
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(msg => {
      // Parse metadata for error information
      let hasError = false;
      let errorType: ErrorType = 'unknown';

      if (msg.metadata) {
        try {
          const metadata = JSON.parse(msg.metadata);
          if (metadata.errorType) {
            hasError = true;
            errorType = metadata.errorType as ErrorType;
          }
        } catch (e) {
          console.error('Error parsing message metadata:', e);
        }
      }

      return {
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant' | 'system',
        timestamp: new Date(msg.timestamp),
        isLoading: false,

        // Include token information
        tokensInput: msg.tokensInput,
        tokensOutput: msg.tokensOutput,
        contextTokens: msg.contextTokens,
        // Include error information
        hasError,
        errorType,
      };
    });

  // Calculate token usage
  let totalTokensInput = 0;
  let totalTokensOutput = 0;
  let currentContextSize = 0;

  if (messages.length > 0) {
    // Sort messages to get the newest one
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Get the current context size from most recent message
    if (sortedMessages[0].contextTokens) {
      currentContextSize = sortedMessages[0].contextTokens;
    }

    // Calculate total tokens by summing all messages
    messages.forEach(msg => {
      if (msg.tokensInput) totalTokensInput += msg.tokensInput;
      if (msg.tokensOutput) totalTokensOutput += msg.tokensOutput;
    });
  }

  const tokenUsage: TokenUsageMetrics = {
    tokensSent: totalTokensInput,
    tokensReceived: totalTokensOutput,
    contextSize: currentContextSize,
  };

  return { messages, tokenUsage };
};

// Hook for fetching chat messages
export function useChatMessages(
  projectId: number,
  initialMessages: ChatMessageProps[] = [],
  initialIsLoading = false
) {
  console.log('🚀 [useChatMessages] Hook called:', {
    projectId,
    initialMessagesCount: initialMessages.length,
    initialIsLoading,
  });

  return useQuery({
    queryKey: ['messages', projectId],
    queryFn: async () => {
      console.log('🚀 [useChatMessages] TanStack Query: Fetching messages from API endpoint');
      return await fetchMessages(projectId);
    },
    initialData: (() => {
      const hasInitialData = initialMessages.length > 0;
      console.log('🚀 [useChatMessages] TanStack Query config:', {
        hasInitialData,
        enabled: !initialIsLoading,
        initialIsLoading,
        willUseInitialData: hasInitialData,
      });

      if (hasInitialData) {
        // Calculate token usage for initial messages
        let totalTokensInput = 0;
        let totalTokensOutput = 0;
        let currentContextSize = 0;

        if (initialMessages.length > 0) {
          const sortedMessages = [...initialMessages].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          if (sortedMessages[0].contextTokens) {
            currentContextSize = sortedMessages[0].contextTokens;
          }

          initialMessages.forEach(msg => {
            if (msg.tokensInput) totalTokensInput += msg.tokensInput;
            if (msg.tokensOutput) totalTokensOutput += msg.tokensOutput;
          });
        }

        return {
          messages: initialMessages.map(msg => ({ ...msg, isLoading: false, className: '' })),
          tokenUsage: {
            tokensSent: totalTokensInput,
            tokensReceived: totalTokensOutput,
            contextSize: currentContextSize,
          },
        };
      }

      return undefined;
    })(),
    enabled: !initialIsLoading,
    staleTime: 60000, // Consider data fresh for 60 seconds since we have real-time updates
  });
}
