'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { useUser } from '@/lib/auth';
import { Action } from './assistant-actions-card';
import ChatInput from './chat-input';
import ChatMessage, { ChatMessageProps, ErrorType } from './chat-message';
import LimitReachedModal from './limit-reached-modal';
import ModelBanner from './model-banner';
import TokenUsage from './token-usage';

// Extended version of Action that includes messageId
interface ExtendedAction extends Action {
  messageId?: number;
}

interface User {
  id: number;
  role: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  marketingEmails: boolean | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ChatInterfaceProps {
  projectId: number;
  initialMessages?: Omit<ChatMessageProps, 'isLoading' | 'className'>[];
  className?: string;
  isLoading?: boolean;
}

// Token usage interface
interface TokenUsageMetrics {
  tokensSent: number;
  tokensReceived: number;
  contextSize: number;
}

// API response type for chat messages
interface ApiChatMessage {
  id: number;
  projectId: number;
  userId: number | null;
  content: string;
  role: string;
  timestamp: string | Date;
  actions?: ExtendedAction[];
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  metadata?: string; // JSON string possibly containing error information
}

// Define proper types for message options
interface MessageOptions {
  includeContext?: boolean;
  contextFiles?: string[];
  imageFile?: File;
}

// Helper function to read file as data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// API functions
const fetchMessages = async (projectId: number): Promise<ChatMessageProps[]> => {
  const response = await fetch(`/api/projects/${projectId}/chat`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chat history: ${response.statusText}`);
  }

  const data = await response.json();
  const apiMessages: ApiChatMessage[] = data.messages || [];

  // Enhanced debug logging to verify operations are in the response
  console.log('🔍 Full API response data:', data);
  console.log('🔍 Messages in response:', data.messages?.length || 0);

  if (data.messages && Array.isArray(data.messages)) {
    data.messages.forEach((m: ApiChatMessage, index: number) => {
      console.log(`🔍 Message ${index + 1} (ID: ${m.id}, role: ${m.role}):`);
      console.log(`  - Content preview: "${m.content.substring(0, 50)}..."`);
      console.log(`  - Has actions: ${m.actions && m.actions.length > 0}`);
      console.log(`  - Actions count: ${m.actions?.length || 0}`);
      console.log(`  - Tokens - Input: ${m.tokensInput}, Output: ${m.tokensOutput}, Context: ${m.contextTokens}`);
      console.log(`  - Metadata: ${m.metadata || 'none'}`);

      if (m.actions && m.actions.length > 0) {
        console.log(`  - Actions details:`, m.actions.map((a, i) => ({
          index: i + 1,
          type: a.type,
          path: a.path,
          timestamp: a.timestamp,
          status: a.status,
          messageId: a.messageId
        })));
      }
    });
  }

  return apiMessages
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
        // Process actions - ensure dates are converted to Date objects
        actions: msg.actions && msg.actions.length > 0
          ? msg.actions.map(op => ({
              ...op,
              timestamp: new Date(op.timestamp)
            }))
          : undefined,
        // Include token information
        tokensInput: msg.tokensInput,
        tokensOutput: msg.tokensOutput,
        contextTokens: msg.contextTokens,
        // Include error information
        hasError,
        errorType
      };
    });
};

// Enhanced sendMessage function with unified streaming support
const sendMessage = async (
  projectId: number,
  content: string,
  options?: {
    includeContext?: boolean;
    contextFiles?: string[];
    imageFile?: File;
  },
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

      // For text messages, handle streaming response (restored original behavior)
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

              const data = JSON.parse(rawData);
              console.log('📡 Streaming update:', data);

              // Parse Python agent events into Action objects for real-time display
              if (data.type && data.file_path !== undefined && data.message && data.status) {
                // Convert Python agent event to Action object
                const action: Action = {
                  type: data.type as Action['type'], // type from Python agent (thinking, create, edit, delete, etc.)
                  path: data.file_path, // file_path from Python agent
                  status: data.status as Action['status'], // status from Python agent (pending, completed, error)
                  timestamp: new Date(),
                  messageId: assistantMessageId, // Link to the assistant message
                  content: data.message, // message from Python agent
                };

                // Update actions array for real-time display
                const existingActionIndex = streamingActions.findIndex(a => a.type === action.type && a.path === action.path);
                if (existingActionIndex >= 0) {
                  // Update existing action
                  streamingActions[existingActionIndex] = action;
                } else {
                  // Add new action
                  streamingActions.push(action);
                }

                console.log(`🎯 Created Action: ${action.type} on ${action.path} - ${action.status}`);

                // Notify actions callback for real-time UI updates
                if (actionsCallback) {
                  actionsCallback([...streamingActions]); // Send copy of actions array
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
          actions: streamingActions, // Include parsed actions
        } as ApiChatMessage,
        success: true,
      };
    }

  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};





export default function ChatInterface({
  projectId,
  initialMessages = [],
  className,
  isLoading: initialIsLoading = false,
}: ChatInterfaceProps) {

  // Debug initial state
  console.log('🚀 [ChatInterface] Component mounted/updated:', {
    projectId,
    initialMessagesCount: initialMessages.length,
    initialIsLoading,
    hasInitialMessagesWithActions: initialMessages.some(msg => msg.actions && msg.actions.length > 0)
  });

  if (initialMessages.length > 0) {
    console.log('🚀 [ChatInterface] Initial messages sample:',
      initialMessages.slice(0, 2).map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content.substring(0, 50) + '...',
        hasActions: msg.actions && msg.actions.length > 0,
        actionsCount: msg.actions?.length || 0
      }))
    );
  }
  // TanStack Query setup
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>('unknown');
  const { userPromise } = useUser();
  const [user, setUser] = useState<User | null>(null);

  // Track the last message sent for regeneration
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [lastMessageOptions, setLastMessageOptions] = useState<MessageOptions | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Token usage state
  const [tokenUsage, setTokenUsage] = useState<TokenUsageMetrics>({
    tokensSent: 0,
    tokensReceived: 0,
    contextSize: 0
  });

  // Real-time streaming state
  const [streamingActions, setStreamingActions] = useState<Action[]>([]);
  const [streamingAssistantMessageId, setStreamingAssistantMessageId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamAbortController, setStreamAbortController] = useState<AbortController | null>(null);

  // Fetch user data
  useEffect(() => {
    userPromise.then(userData => {
      setUser(userData);
    });
  }, [userPromise]);

  // Function to cancel ongoing stream
  const cancelStream = () => {
    if (streamAbortController) {
      console.log('🛑 Cancelling stream...');
      streamAbortController.abort();
      setIsStreaming(false);
      setStreamingActions([]);
      setStreamingContent('');
      setStreamingAssistantMessageId(null);
      setStreamAbortController(null);
    }
  };

  // Query for messages
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch
  } = useQuery({
    queryKey: ['messages', projectId],
    queryFn: async () => {
      console.log('🚀 [ChatInterface] TanStack Query: Fetching messages from API endpoint');
      const messages = await fetchMessages(projectId);

      // Calculate total token usage
      // Now we're getting token totals from aggregated query in the API
      // and the current context size from the most recent message

      // The API should have already calculated this for us, but let's ensure
      // we use the most recent context size and total token sums
      let totalTokensInput = 0;
      let totalTokensOutput = 0;
      let currentContextSize = 0;

      // If we have messages, get the values from the most recent ones
      if (messages.length > 0) {
        // Sort messages to get the newest one
        const sortedMessages = [...messages].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
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

      // Update token usage state
      setTokenUsage({
        tokensSent: totalTokensInput,
        tokensReceived: totalTokensOutput,
        contextSize: currentContextSize
      });

      return messages;
    },
    initialData: (() => {
      const hasInitialData = initialMessages.length > 0;
      console.log('🚀 [ChatInterface] TanStack Query config:', {
        hasInitialData,
        enabled: !initialIsLoading,
        initialIsLoading,
        willUseInitialData: hasInitialData
      });

      return hasInitialData
        ? initialMessages.map(msg => ({ ...msg, isLoading: false, className: '' }))
        : undefined;
    })(),
    enabled: !initialIsLoading,
    // Removed polling since we now have real-time streaming via SSE
    // refetchInterval: 60000,
    staleTime: 60000, // Consider data fresh for 60 seconds since we have real-time updates
  });

  // Mutation for sending messages
  const {
    mutate,
    isPending: isSending
  } = useMutation({
    mutationFn: (args: {
      content: string;
      options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File }
    }) => {
      // Set up streaming state and callback
      setIsStreaming(true);
      setStreamingActions([]);
      setStreamingContent('');

      // Create AbortController for stream cancellation
      const abortController = new AbortController();
      setStreamAbortController(abortController);

      // Create streaming callback that updates real-time state
      const streamingCallback = (content: string) => {
        setStreamingContent(content);
      };

      // Create actions callback for real-time action updates
      const actionsCallback = (actions: Action[]) => {
        setStreamingActions(actions);
      };

      // Create assistant ID callback
      const setAssistantIdCallback = (id: number) => {
        setStreamingAssistantMessageId(id);
      };

      return sendMessage(projectId, args.content, args.options, streamingCallback, actionsCallback, setAssistantIdCallback, abortController);
    },
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', projectId] });

      // Save the last message for potential regeneration
      setLastUserMessage(newMessage.content);
      setLastMessageOptions(newMessage.options || null);

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', projectId]);

      // Create optimistic content that includes image information if present
      const optimisticContent = newMessage.content;

      // Reset any previous errors when sending a new message
      setIsError(false);
      setErrorMessage('');
      setErrorType('unknown');

      // Optimistically update to the new value (just add user message, no "Thinking...")
      queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) => [
        ...old,
        {
          id: Date.now(),
          content: optimisticContent,
          role: 'user',
          timestamp: new Date(),
          isLoading: false,
        }
      ]);

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
          queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) => {
            // Find the optimistic user message we just added (it will be the second to last)
            const userMessageIndex = old.length - 2;
            if (userMessageIndex >= 0 && old[userMessageIndex].role === 'user') {
              const updatedMessages = [...old];
              updatedMessages[userMessageIndex] = {
                ...updatedMessages[userMessageIndex],
                content: updatedOptimisticContent,
              };
              return updatedMessages;
            }
            return old; // Should not happen, but return old data as fallback
          });

        } catch (error) {
          console.error("Error creating data URL for optimistic image:", error);
          // Optionally handle error, e.g., revert or show placeholder
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

      // Set error state with type information if available
      setIsError(true);

      if (error instanceof Error && error.message === 'LIMIT_REACHED') {
        setErrorMessage('LIMIT_REACHED');
      } else {
        // Try to extract error type
        const errorType = error instanceof Error && 'errorType' in error
          ? (error as Error & { errorType: ErrorType }).errorType
          : 'unknown';
        setErrorType(errorType as ErrorType);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to send message');
      }
    },
    onSuccess: (data) => {
      // If request contains fileUpdated flag, update preview
      if (data.fileUpdated) {
        const fileUpdatedEvent = new CustomEvent('file-updated', {
          detail: { projectId }
        });
        window.dispatchEvent(fileUpdatedEvent);
      }

      // Update token usage if available in response
      if (data.totalTokensInput !== undefined || data.contextTokens !== undefined) {
        setTokenUsage({
          tokensSent: data.totalTokensInput || 0,
          tokensReceived: data.totalTokensOutput || 0,
          contextSize: data.contextTokens || 0
        });
      }

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
    },
    onSettled: () => {
      // Always invalidate when settled (success or error)
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] });

      // Clean up streaming state
      setIsStreaming(false);
      setStreamingActions([]);
      setStreamingContent('');
      setStreamingAssistantMessageId(null);
      setStreamAbortController(null); // Clear the controller on settled
    }
  });

  // Scroll to bottom when messages change or streaming updates
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
      }
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [messages, isLoadingMessages]);

  // Handle sending messages
  const handleSendMessage = async (
    content: string,
    options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File }
  ) => {
    if (!content.trim() && !options?.imageFile) return;

    // Reset error state
    setIsError(false);
    setErrorMessage('');
    setErrorType('unknown');

    // Check if the message contains keywords for preview refresh or if it has an image
    if (content.toLowerCase().includes('update') ||
        content.toLowerCase().includes('change') ||
        content.toLowerCase().includes('modify') ||
        options?.imageFile) {
        const fileUpdatedEvent = new CustomEvent('file-updated', {
          detail: { projectId }
        });
        window.dispatchEvent(fileUpdatedEvent);
      }

    // Log if we're sending an image
    if (options?.imageFile) {
      console.log(`Sending message with attached image: ${options.imageFile.name} (${(options.imageFile.size / 1024).toFixed(1)}KB)`);
    }

    // Send the message
    await mutate({ content, options });
  };

  // Implement regeneration functionality
  const handleRegenerate = async () => {
    // Only regenerate if we have a last user message
    if (!lastUserMessage && !lastMessageOptions?.imageFile) {
      console.warn('Cannot regenerate: No previous message to resend');
      return;
    }

    setIsRegenerating(true);

    try {
      // Find and remove all messages after the last user message
      const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');

      if (lastUserMessageIndex >= 0) {
        const userMessageIndex = messages.length - 1 - lastUserMessageIndex;
        const updatedMessages = messages.slice(0, userMessageIndex + 1);

        // Optimistically update messages to remove any failed assistant responses
        queryClient.setQueryData(['messages', projectId], updatedMessages);

        // Clear error state
        setIsError(false);
        setErrorMessage('');

        // Re-send the last user message with proper type handling
        await mutate({
          content: lastUserMessage,
          options: lastMessageOptions || undefined
        });
      }
    } catch (error) {
      console.error('Error during regeneration:', error);
      // Keep error state but update the message
      setErrorMessage('Failed to regenerate response');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Filter messages to only remove welcome message when there are user messages
  const filteredMessages = messages.filter(message => {
    // If there are user messages, filter out the system welcome message
    const hasUserMessages = messages.some(m => m.role === 'user');
    if (hasUserMessages &&
        message.role === 'system' &&
        message.content.includes('Project created successfully')) {
      return false;
    }

    // Show ALL messages from the assistant, including file operation messages
    return true;
  });

  // No more filtering needed since we removed "Thinking..." messages
  const messagesWithoutThinking = filteredMessages;

  // Enhance filtered messages with showAvatar property
  const enhancedMessages = messagesWithoutThinking.map((message, index) => {
    // Determine if we should show avatar based on the previous message
    let showAvatar = true;

    if (index > 0) {
      const prevMessage = messagesWithoutThinking[index - 1];
      // Hide avatar if current message is from the same entity as previous message
      if (prevMessage.role === message.role) {
        showAvatar = false;
      }
    }

    return {
      ...message,
      showAvatar,
      onRegenerate: message.role === 'assistant' && message.hasError ? handleRegenerate : undefined,
    };
  });

  return (
    <div className={cn('flex flex-col h-full', className)} data-testid="chat-interface">
      <ModelBanner />
      <TokenUsage
        tokensSent={tokenUsage.tokensSent}
        tokensReceived={tokenUsage.tokensReceived}
        contextSize={tokenUsage.contextSize}
      />

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {messages.length === 0 && isLoadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No messages yet. Start a conversation!
            </div>
          ) : (
            <>
              {enhancedMessages.map(message => (
                <ChatMessage
                  key={message.id}
                  id={message.id}
                  content={message.content}
                  role={message.role}
                  timestamp={message.timestamp}
                  isLoading={message.isLoading}
                  user={user ? {
                    name: user.name || undefined,
                    email: user.email,
                    imageUrl: user.imageUrl || undefined
                  } : undefined}
                  actions={message.actions}
                  showAvatar={message.showAvatar}
                  hasError={message.hasError}
                  errorType={message.errorType}
                  onRegenerate={message.onRegenerate}
                />
                            ))}

              {/* Real-time streaming assistant message */}
              {isStreaming && streamingAssistantMessageId && (
                <>
                  <ChatMessage
                    key={`streaming-${streamingAssistantMessageId}`}
                    id={streamingAssistantMessageId}
                    content={streamingContent}
                    role="assistant"
                    timestamp={new Date()}
                    isLoading={true}
                    user={user ? {
                      name: user.name || undefined,
                      email: user.email,
                      imageUrl: user.imageUrl || undefined
                    } : undefined}
                    actions={streamingActions}
                    showAvatar={true}
                  />

                  {/* Cancel stream button */}
                  <div className="flex justify-center py-2">
                    <button
                      onClick={cancelStream}
                      className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
                    >
                      Cancel Generation
                    </button>
                  </div>
                </>
              )}

              {/* Show streaming error if any */}
              {/* {streamingError && ( */}
              {/*   <div className="p-4 m-4 text-sm text-center bg-card border border-destructive/30 rounded-md"> */}
              {/*     <div className="flex items-center justify-center gap-2 text-destructive mb-2"> */}
              {/*       <AlertTriangle className="h-5 w-5" /> */}
              {/*       <p className="font-medium">Streaming Error</p> */}
              {/*     </div> */}
              {/*     <p className="text-muted-foreground">{streamingError}</p> */}
              {/*     <button */}
              {/*       onClick={handleRegenerate} */}
              {/*       className="mt-2 px-3 py-1 text-xs bg-primary hover:bg-primary/80 text-primary-foreground rounded-md transition-colors flex items-center gap-1 mx-auto" */}
              {/*     > */}
              {/*       <RefreshCcw className="h-3 w-3" /> Retry */}
              {/*     </button> */}
              {/*   </div> */}
              {/* )} */}
            </>
          )}
          {isError && errorMessage !== 'LIMIT_REACHED' && (
            <div className="p-4 m-4 text-sm text-center bg-card border border-destructive/30 rounded-md">
              <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">
                  {errorType === 'timeout' && 'The request timed out'}
                  {errorType === 'parsing' && 'Error processing AI response'}
                  {errorType === 'processing' && 'Error processing your request'}
                  {errorType === 'unknown' && 'There was an issue with the chat service'}
                </p>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="mt-1 px-3 py-1.5 text-xs bg-primary hover:bg-primary/80 text-primary-foreground rounded-md transition-colors flex items-center gap-1 mx-auto"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-3 w-3" />
                    Regenerate Response
                  </>
                )}
              </button>
            </div>
          )}
          {isError && errorMessage === 'LIMIT_REACHED' && (
            <LimitReachedModal onReset={refetch} />
          )}
          <div ref={messagesEndRef} className="pb-6" />
        </div>
      </ScrollArea>

      <div className="px-4 pb-0 relative">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isSending || isRegenerating}
          placeholder="Type your message..."
          data-testid="chat-input"
          className="chat-input"
        />
      </div>
    </div>
  );
}
