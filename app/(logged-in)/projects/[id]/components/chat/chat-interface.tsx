'use client';

import { AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

// Import types and hooks
import { useChatMessages } from '@/hooks/use-chat-messages';
import { useChatState } from '@/hooks/use-chat-state';
import { useSendMessage } from '@/hooks/use-send-message';
import type { ChatInterfaceProps, ChatUser } from '@/lib/types';

// Import components
import ChatInput from './chat-input';
import ChatMessage from './chat-message';
import LimitReachedModal from './limit-reached-modal';
import ModelBanner from './model-banner';
import TokenUsage from './token-usage';







export default function ChatInterface({
  projectId,
  initialMessages = [],
  className,
  isLoading: initialIsLoading = false,
}: ChatInterfaceProps) {
  console.log('🚀 [ChatInterface] Component mounted/updated:', {
    projectId,
    initialMessagesCount: initialMessages.length,
    initialIsLoading,
    hasInitialMessagesWithActions: initialMessages.some(msg => msg.actions && msg.actions.length > 0)
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // User data
  const { userPromise } = useUser();
  const [user, setUser] = useState<ChatUser | null>(null);

  // Custom hooks for business logic
  const messagesQuery = useChatMessages(projectId, initialMessages, initialIsLoading);
  const sendMessageMutation = useSendMessage(projectId);
  const chatState = useChatState(projectId);

  // Extract data from hooks
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch
  } = messagesQuery;

  const messages = messagesData?.messages || [];
  const tokenUsage = messagesData?.tokenUsage || { tokensSent: 0, tokensReceived: 0, contextSize: 0 };

  const {
    sendMessage,
    isLoading: isSending,
    error: sendError,
    isStreaming,
    streamingActions,
    streamingContent,
    streamingAssistantMessageId,
    cancelStream,
  } = sendMessageMutation;

  const {
    isError,
    errorMessage,
    errorType,
    isRegenerating,
    handleMutationError,
    saveLastMessage,
    regenerateMessage,
    getErrorMessage,
    clearError,
    resetChat,
  } = chatState;

  // Fetch user data
  useEffect(() => {
    userPromise.then(userData => {
      setUser(userData);
    });
  }, [userPromise]);

  // Handle send errors
  useEffect(() => {
    if (sendError) {
      handleMutationError(sendError);
    }
  }, [sendError, handleMutationError]);

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
  }, [messages, isLoadingMessages, streamingContent]);

  // Handle sending messages
  const handleSendMessage = async (
    content: string,
    options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File }
  ) => {
    if (!content.trim() && !options?.imageFile) return;

    // Clear error state
    clearError();

    // Save message for regeneration
    saveLastMessage(content, options);

    // Trigger preview refresh if needed
    if (content.toLowerCase().includes('update') ||
        content.toLowerCase().includes('change') ||
        content.toLowerCase().includes('modify') ||
        options?.imageFile) {
        const fileUpdatedEvent = new CustomEvent('file-updated', {
          detail: { projectId }
        });
        window.dispatchEvent(fileUpdatedEvent);
      }

    // Log if sending an image
    if (options?.imageFile) {
      console.log(`Sending message with attached image: ${options.imageFile.name} (${(options.imageFile.size / 1024).toFixed(1)}KB)`);
    }

    // Send the message
    sendMessage({ content, options });
  };

  // Handle regeneration
  const handleRegenerate = async () => {
    await regenerateMessage(async (content, options) => {
      sendMessage({ content, options });
    });
  };

  // Filter and enhance messages for display
  const filteredMessages = messages.filter(message => {
    // If there are user messages, filter out the system welcome message
    const hasUserMessages = messages.some(m => m.role === 'user');
    if (hasUserMessages &&
        message.role === 'system' &&
        message.content.includes('Project created successfully')) {
      return false;
    }
    return true;
  });

  // Enhance messages with showAvatar property
  const enhancedMessages = filteredMessages.map((message, index) => {
    let showAvatar = true;

    if (index > 0) {
      const prevMessage = filteredMessages[index - 1];
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
            </>
          )}

          {/* Error states */}
          {isError && errorMessage !== 'LIMIT_REACHED' && (
            <div className="p-4 m-4 text-sm text-center bg-card border border-destructive/30 rounded-md">
              <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">
                  {getErrorMessage(errorType)}
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
            <LimitReachedModal onReset={resetChat} />
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
