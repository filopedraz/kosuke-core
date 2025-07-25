'use client';

import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import ChatInput from './chat-input';
import ChatMessage, { ChatMessageProps, ErrorType } from './chat-message';
import ModelBanner from './model-banner';
import TokenUsage from './token-usage';
import LimitReachedModal from './limit-reached-modal';
import { useUser } from '@/lib/auth';
import { Action } from './assistant-actions-card';

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

  // Debug to verify operations are in the response
  console.log('Debug API response:', data.messages?.map((m: ApiChatMessage) => ({
    id: m.id,
    role: m.role,
    hasOperations: m.actions && m.actions.length > 0,
    operationsCount: m.actions?.length || 0,
    tokensInput: m.tokensInput,
    tokensOutput: m.tokensOutput,
    contextTokens: m.contextTokens,
    metadata: m.metadata
  })));

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

// Enhanced sendMessage function with streaming support
const sendMessage = async (
  projectId: number,
  content: string,
  options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File }
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
  // For image uploads, still use the traditional endpoint
  if (options?.imageFile) {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('includeContext', options.includeContext ? 'true' : 'false');
    
    if (options.contextFiles && options.contextFiles.length) {
      formData.append('contextFiles', JSON.stringify(options.contextFiles));
    }
    
    formData.append('image', options.imageFile);
    
    const response = await fetch(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('LIMIT_REACHED');
      }
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  // For text messages, save to database and return success
  // Actual processing will happen via streaming endpoint
  try {
    console.log('💾 Saving user message to database');
    
    const saveResponse = await fetch(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        includeContext: options?.includeContext || false,
        contextFiles: options?.contextFiles || [],
      }),
    });
    
    if (!saveResponse.ok) {
      if (saveResponse.status === 403) {
        throw new Error('LIMIT_REACHED');
      }
      
      const errorData = await saveResponse.json().catch(() => ({}));
      if (errorData && typeof errorData === 'object' && 'errorType' in errorData) {
        const error = new Error(errorData.error || 'Failed to send message');
        Object.assign(error, { errorType: errorData.errorType });
        throw error;
      }
      
      throw new Error(`Failed to send message: ${saveResponse.statusText}`);
    }
    
    const saveResult = await saveResponse.json();
    
    // Start streaming processing in background
    setTimeout(() => {
      startStreamingProcessing(projectId, content);
    }, 100);
    
    return saveResult;
    
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

// Streaming processing function
const startStreamingProcessing = async (projectId: number, content: string) => {
  try {
    console.log('🚀 Starting streaming processing via Python agent');
    
    const response = await fetch(`/api/projects/${projectId}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      console.error('Streaming failed:', response.statusText);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.error('No reader available for streaming');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('✅ Streaming completed');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            console.log('📡 Streaming update:', data);
            
            // Streaming updates will trigger database updates via webhooks
            // The SSE connection will pick up those updates automatically
          } catch {
            console.warn('Failed to parse streaming data:', line);
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming processing error:', error);
  }
};

export default function ChatInterface({
  projectId,
  initialMessages = [],
  className,
  isLoading: initialIsLoading = false,
}: ChatInterfaceProps) {
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
  
  // Fetch user data
  useEffect(() => {
    userPromise.then(userData => {
      setUser(userData);
    });
  }, [userPromise]);
  
  // Query for messages
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
    refetch
  } = useQuery({
    queryKey: ['messages', projectId],
    queryFn: async () => {
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
    initialData: initialMessages.length > 0 
      ? initialMessages.map(msg => ({ ...msg, isLoading: false, className: '' }))
      : undefined,
    enabled: !initialIsLoading,
    refetchInterval: 60000, // Reduced polling: every 60 seconds (was 30 seconds)
    staleTime: 30000, // Consider data fresh for 30 seconds (was 15 seconds)
  });
  
  // Mutation for sending messages
  const { 
    mutate, 
    isPending: isSending
  } = useMutation({
    mutationFn: (args: { 
      content: string; 
      options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File } 
    }) => sendMessage(projectId, args.content, args.options),
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
      
      // Optimistically update to the new value
      queryClient.setQueryData(['messages', projectId], (old: ChatMessageProps[] = []) => [
        ...old,
        {
          id: Date.now(),
          content: optimisticContent,
          role: 'user',
          timestamp: new Date(),
          isLoading: false,
        },
        {
          id: Date.now() + 1,
          content: 'Thinking...',
          role: 'assistant',
          timestamp: new Date(),
          isLoading: true,
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
    }
  });
  
  // Scroll to bottom when messages change
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
  }, [messages]);
  
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

  // Filter out "Thinking..." messages that are followed by another assistant message
  const messagesWithoutThinking = filteredMessages.filter((message, index) => {
    // Keep the message if it's not a "Thinking..." message from the assistant
    if (message.role !== 'assistant' || message.content !== 'Thinking...') {
      return true;
    }
    
    // Check if this "Thinking..." message is followed by another assistant message
    // If so, don't include it in the rendered messages
    const nextMessage = filteredMessages[index + 1];
    if (nextMessage && nextMessage.role === 'assistant') {
      return false;
    }
    
    // Keep "Thinking..." message if it's not followed by another assistant message
    return true;
  });

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

  // Setup SSE event listener for real-time updates
  useEffect(() => {
    // Only set up SSE if we don't already have one
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let lastEventTime = Date.now();
    
    const setupSSE = () => {
      if (eventSource) return; // Prevent duplicate connections
      
      eventSource = new EventSource(`/api/projects/${projectId}/chat/sse`);
      console.log('📡 SSE connection established for project:', projectId);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Skip heartbeat messages silently
          if (data.type === 'heartbeat') return;
          
          // Prevent too frequent refetches
          const now = Date.now();
          const timeSinceLastEvent = now - lastEventTime;
          
          // Only process events if it's been at least 2 seconds since the last one
          if (timeSinceLastEvent > 2000) {
            lastEventTime = now;
            
            // Process message
            if (data.type === 'new_message') {
              console.log('📨 New message received');
              // Invalidate and refetch messages when a new message arrives
              queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
              
              // Dispatch custom event to refresh preview when assistant message is received
              if (data.role === 'assistant') {
                console.log('🔄 Assistant message received, triggering preview refresh');
                const refreshPreviewEvent = new CustomEvent('refresh-preview', {
                  detail: { projectId }
                });
                window.dispatchEvent(refreshPreviewEvent);
              }
            } else if (data.type === 'file_updated') {
              console.log('📄 File updated event received');
              // Trigger file update event for UI
              const fileUpdatedEvent = new CustomEvent('file-updated', {
                detail: { projectId }
              });
              window.dispatchEvent(fileUpdatedEvent);
              // Invalidate queries to refresh messages with updated file operations
              queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
            } else if (data.type === 'token_update' && data.tokens) {
              console.log('🔢 Token update received', data.tokens);
              // Update token usage metrics directly from the event
              setTokenUsage({
                tokensSent: data.tokens.tokensSent,
                tokensReceived: data.tokens.tokensReceived,
                contextSize: data.tokens.contextSize
              });
            } else if (data.type === 'error') {
              console.log('🛑 Error event received', data);
              // Set error state from SSE
              setIsError(true);
              setErrorType(data.errorType || 'unknown');
              setErrorMessage(data.message || 'An error occurred');
              
              // Invalidate messages to show the error
              queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
            }
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = () => {
        console.log('⚠️ SSE connection error, will reconnect in 5 seconds');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // Reconnect after 5 seconds
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(setupSSE, 5000);
      };
    };
    
    setupSSE();
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [projectId, queryClient]);

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