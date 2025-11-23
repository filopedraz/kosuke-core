'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import ChatInput from '../chat/chat-input';
import ChatMessage from '../chat/chat-message';
import MarkdownPreview from './markdown-preview';
import type { ContentBlock, AssistantBlock } from '@/lib/types';

interface RequirementsViewProps {
  projectId: string;
  projectName: string;
  projectStatus: 'requirements' | 'in_development';
  isChatCollapsed?: boolean;
}

interface RequirementsMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  blocks?: Array<{ type: string; content: string }>;
  timestamp: Date;
}

export default function RequirementsView({
  projectId,
  projectName: _projectName,
  projectStatus,
  isChatCollapsed = false,
}: RequirementsViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [docsContent, setDocsContent] = useState('');
  const [messages, setMessages] = useState<RequirementsMessage[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingBlocks, setStreamingBlocks] = useState<ContentBlock[]>([]);
  const [_streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // User data from Clerk
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    imageUrl?: string;
  } | null>(null);

  // Set user data when Clerk user is loaded
  useEffect(() => {
    if (isLoaded && clerkUser) {
      setUser({
        name: clerkUser.fullName || undefined,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        imageUrl: clerkUser.imageUrl || undefined,
      });
    }
  }, [isLoaded, clerkUser]);

  // Fetch initial docs content and messages
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Fetch docs
        const docsResponse = await fetch(`/api/projects/${projectId}/requirements`);
        if (docsResponse.ok && isMounted) {
          const docsData = await docsResponse.json();
          setDocsContent(docsData.data.docs);
        }

        // Fetch message history
        const messagesResponse = await fetch(`/api/projects/${projectId}/requirements/messages`);
        if (messagesResponse.ok && isMounted) {
          const messagesData = await messagesResponse.json();
          setMessages(
            messagesData.data.messages.map((msg: RequirementsMessage) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching requirements data:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Failed to load requirements data',
            variant: 'destructive',
          });
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // Removed toast from dependencies to prevent infinite loop

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [messages, streamingBlocks]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || projectStatus === 'in_development') return;

      // Optimistically add user message to UI immediately
      const optimisticUserMessage: RequirementsMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, optimisticUserMessage]);

      setIsLoading(true);
      setIsStreaming(true);
      setStreamingBlocks([]);
      setStreamingMessageId(null);

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(`/api/projects/${projectId}/requirements/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Failed to send message');

        // Get assistant message ID from headers
        const assistantMessageId = response.headers.get('X-Assistant-Message-Id') || '';
        setStreamingMessageId(assistantMessageId);

        // Handle streaming response
        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Create initial text block for streaming
        const textBlock: ContentBlock = {
          id: `block-0`,
          index: 0,
          type: 'text',
          content: '',
          status: 'streaming',
          timestamp: new Date(),
        };
        setStreamingBlocks([textBlock]);

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                // Streaming complete
                setIsStreaming(false);
                setStreamingBlocks([]);
                setStreamingMessageId(null);

                // Refresh messages from server
                const messagesResponse = await fetch(
                  `/api/projects/${projectId}/requirements/messages`
                );
                if (messagesResponse.ok) {
                  const messagesData = await messagesResponse.json();
                  setMessages(
                    messagesData.data.messages.map((msg: RequirementsMessage) => ({
                      ...msg,
                      timestamp: new Date(msg.timestamp),
                    }))
                  );
                }
                continue;
              }

              try {
                const event = JSON.parse(data);

                if (event.type === 'content_block_delta' && event.text) {
                  // Update streaming text block
                  setStreamingBlocks(prevBlocks => {
                    const updatedBlocks = [...prevBlocks];
                    const block = updatedBlocks[0];
                    if (block && block.type === 'text') {
                      block.content += event.text;
                    }
                    return updatedBlocks;
                  });
                } else if (event.type === 'error') {
                  throw new Error(event.message || 'Streaming error');
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (error: unknown) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticUserMessage.id));

        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Stream cancelled by user');
        } else {
          console.error('Error sending message:', error);
          toast({
            title: 'Error',
            description: 'Failed to send message',
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        setStreamingBlocks([]);
        setStreamingMessageId(null);
        abortControllerRef.current = null;
      }
    },
    [projectId, toast, isLoading, projectStatus]
  );

  const handleCancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
    setStreamingBlocks([]);
    setStreamingMessageId(null);
  }, []);

  const handleConfirmRequirements = async () => {
    setIsConfirming(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/requirements`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) throw new Error('Failed to confirm requirements');

      const data = await response.json();

      toast({
        title: 'Requirements Confirmed!',
        description: data.data.message,
      });

      // Refresh the page to show the modal and new status
      router.refresh();
    } catch (error) {
      console.error('Error confirming requirements:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm requirements',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Convert messages to enhanced format for display
  const enhancedMessages = useMemo(() => {
    return messages.map((message, index) => {
      let showAvatar = true;

      if (index > 0) {
        const prevMessage = messages[index - 1];
        if (prevMessage && prevMessage.role === message.role) {
          showAvatar = false;
        }
      }

      // Convert blocks to AssistantBlock format (ChatMessage expects AssistantBlock[])
      const assistantBlocks: AssistantBlock[] =
        message.blocks?.map(block => {
          if (block.type === 'text') {
            return {
              type: 'text' as const,
              content: block.content,
            };
          } else if (block.type === 'thinking') {
            return {
              type: 'thinking' as const,
              content: block.content,
            };
          } else {
            // tool type
            return {
              type: 'tool' as const,
              name: 'tool',
              input: {},
              result: block.content,
              status: 'completed' as const,
            };
          }
        }) || [];

      return {
        ...message,
        showAvatar,
        blocks: assistantBlocks,
      };
    });
  }, [messages]);

  return (
    <>
      <div className={cn('flex h-full', isChatCollapsed && 'overflow-hidden')}>
        {/* Left side - Chat Interface */}
        <div
          className={cn(
            'h-full overflow-hidden flex flex-col',
            isChatCollapsed ? 'w-0 opacity-0' : 'w-full sm:w-1/4 md:w-1/4 lg:w-1/4'
          )}
          style={{
            visibility: isChatCollapsed ? 'hidden' : 'visible',
            display: isChatCollapsed ? 'none' : 'flex',
          }}
        >
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="flex flex-col">
              {enhancedMessages.map(message => (
                <ChatMessage
                  key={message.id}
                  id={message.id}
                  content={message.content || ''}
                  blocks={message.blocks}
                  role={message.role}
                  timestamp={message.timestamp}
                  user={
                    user
                      ? {
                          name: user.name || undefined,
                          email: user.email,
                          imageUrl: user.imageUrl || undefined,
                        }
                      : undefined
                  }
                  showAvatar={message.showAvatar}
                />
              ))}

              {/* Streaming assistant response */}
              {isStreaming && streamingBlocks.length > 0 && (
                <div className="animate-in fade-in-0 duration-300">
                  <div className="flex w-full max-w-[95%] mx-auto gap-3 p-4" role="listitem">
                    {/* Avatar */}
                    <div className="relative flex items-center justify-center h-8 w-8">
                      <div className="bg-muted border-primary rounded-md flex items-center justify-center h-full w-full">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-6 w-6 text-primary"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4>AI Assistant</h4>
                        <time className="text-xs text-muted-foreground">now</time>
                      </div>

                      {/* Streaming text */}
                      {streamingBlocks[0] && streamingBlocks[0].content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap">{streamingBlocks[0].content}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          </div>
                          <span className="animate-pulse">Processing request...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="pb-6" />
            </div>
          </ScrollArea>

          <div className="px-4 pb-0 relative">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isStreaming={isStreaming}
              onStop={handleCancelStream}
              placeholder="Describe your project or answer questions..."
              className="chat-input"
            />
          </div>
        </div>

        {/* Right side - Docs Preview */}
        <div
          className={cn(
            'h-full flex flex-col border rounded-md border-border',
            isChatCollapsed ? 'w-full' : 'hidden md:flex sm:w-3/4 md:w-3/4 lg:w-3/4'
          )}
        >
          {/* Header with Confirm Button */}
          <div className="border-b p-4 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-semibold">Requirements Document</h2>
              <p className="text-sm text-muted-foreground">Live preview of docs.md</p>
            </div>
            {projectStatus === 'requirements' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        onClick={() => setShowConfirmModal(true)}
                        disabled={isConfirming || !docsContent}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm Requirements
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!docsContent && (
                    <TooltipContent>
                      <p>Continue the conversation to generate requirements before confirming</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            {projectStatus === 'in_development' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                In Development
              </div>
            )}
          </div>

          {/* Preview Content */}
          <MarkdownPreview content={docsContent} className="flex-1 overflow-hidden" />
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Requirements?</DialogTitle>
            <DialogDescription>
              Once you confirm, your project will enter development. You&apos;ll receive an email
              notification when it&apos;s ready.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nice, see you in a couple of days when completed. You will get notified by email when
              the project has been completed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isConfirming}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmRequirements} disabled={isConfirming}>
                {isConfirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
