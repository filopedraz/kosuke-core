'use client';

import { Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import ChatInput from './chat-input';
import ChatMessage, { ChatMessageProps } from './chat-message';
import ModelBanner from './model-banner';
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

// API response type for chat messages
interface ApiChatMessage {
  id: number;
  projectId: number;
  userId: number | null;
  content: string;
  role: string;
  timestamp: string | Date;
  actions?: ExtendedAction[];
}

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
    operationsCount: m.actions?.length || 0
  })));

  return apiMessages
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(msg => ({
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
        : undefined
    }));
};

const sendMessage = async (
  projectId: number,
    content: string,
    options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File }
): Promise<{ message: ApiChatMessage; success: boolean; fileUpdated?: boolean }> => {
      let requestOptions: RequestInit;
      
      if (options?.imageFile) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('includeContext', options.includeContext ? 'true' : 'false');
        
        if (options.contextFiles && options.contextFiles.length) {
          formData.append('contextFiles', JSON.stringify(options.contextFiles));
        }
        
        formData.append('image', options.imageFile);
        
        requestOptions = {
          method: 'POST',
          body: formData,
        };
      } else {
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            includeContext: options?.includeContext || false,
            contextFiles: options?.contextFiles || [],
          }),
        };
      }
      
      const response = await fetch(`/api/projects/${projectId}/chat`, requestOptions);
      
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('LIMIT_REACHED');
    }
    throw new Error(`Failed to send message: ${response.statusText}`);
  }
  
  return await response.json();
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
  const { userPromise } = useUser();
  const [user, setUser] = useState<User | null>(null);
  
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
      
      // We don't need to fetch file operations separately anymore
      // as they are now included in the chat API response
      
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
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', projectId]);
      
      // Create optimistic content that includes image information if present
      let optimisticContent = newMessage.content;
      const hasImage = !!newMessage.options?.imageFile;
      
      if (hasImage) {
        const file = newMessage.options?.imageFile;
        const fileInfo = file ? `${file.name} (${(file.size / 1024).toFixed(1)}KB)` : '';
        optimisticContent = optimisticContent.trim() 
          ? `${optimisticContent}\n\n[Uploading image: ${fileInfo}...]`
          : `[Uploading image: ${fileInfo}...]`;
      }
      
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
          content: '',
          role: 'assistant',
          timestamp: new Date(),
          isLoading: true,
        }
      ]);
      
      // Return a context object with the snapshot
      return { previousMessages };
    },
    onError: (error, _, context) => {
      // If there's an error, roll back to the previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', projectId], context.previousMessages);
      }
      
      // Set error state
      setIsError(true);
      
      if (error instanceof Error && error.message === 'LIMIT_REACHED') {
        setErrorMessage('LIMIT_REACHED');
      } else {
        setErrorMessage('Failed to send message');
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
  
  // Handle manual reset
  const handleReset = () => {
    setIsError(false);
    setErrorMessage('');
    refetch();
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

  // Enhance filtered messages with showAvatar property
  const enhancedMessages = filteredMessages.map((message, index) => {
    // Determine if we should show avatar based on the previous message
    let showAvatar = true;
    
    if (index > 0) {
      const prevMessage = filteredMessages[index - 1];
      // Hide avatar if current message is from the same entity as previous message
      if (prevMessage.role === message.role) {
        showAvatar = false;
      }
    }
    
    // Determine if this is the last assistant message
    // Find the last index of any assistant message
    const lastAssistantIndex = filteredMessages
      .map((msg, i) => msg.role === 'assistant' ? i : -1)
      .filter(i => i !== -1)
      .pop();
    
    const isLastAssistantMessage = message.role === 'assistant' && index === lastAssistantIndex;
    
    return {
      ...message,
      showAvatar,
      isLastAssistantMessage
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
                  isLastAssistantMessage={message.isLastAssistantMessage}
                />
              ))}
            </>
          )}
          {isError && (
            <div>
              {errorMessage === 'LIMIT_REACHED' ? (
                <LimitReachedModal onReset={handleReset} />
              ) : (
                <div className="p-4 m-4 text-sm text-center bg-card border border-border rounded-md">
                  <p className="text-destructive">There was an issue with the chat service. You can still send messages.</p>
                  <button 
                    onClick={handleReset} 
                    className="mt-2 px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
                  >
                    Reset Chat
                  </button>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} className="pb-6" />
        </div>
      </ScrollArea>
      
      <div className="px-4 pb-0 relative">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isSending}
          placeholder="Type your message..."
          data-testid="chat-input"
          className="chat-input"
        />
      </div>
    </div>
  );
} 