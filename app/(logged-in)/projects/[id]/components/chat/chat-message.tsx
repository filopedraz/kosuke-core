'use client';

import { formatDistanceToNow } from 'date-fns';
import { User, CircleIcon, AlertCircle, RefreshCcw } from 'lucide-react';
import Image from 'next/image';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import AssistantActionsCard, { Action } from './assistant-actions-card';

// Error types from the agent
export type ErrorType = 'timeout' | 'parsing' | 'processing' | 'unknown';

export interface ChatMessageProps {
  id?: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isLoading?: boolean;
  className?: string;
  user?: {
    name?: string;
    email?: string;
    imageUrl?: string;
  };
  actions?: Action[];
  showAvatar?: boolean;
  // Error handling properties
  hasError?: boolean;
  errorType?: ErrorType;
  onRegenerate?: () => void;
  // Token metrics
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
}

export default function ChatMessage({
  content,
  role,
  timestamp,
  isLoading = false,
  className,
  user,
  actions,
  showAvatar = true,
  hasError = false,
  errorType = 'unknown',
  onRegenerate,
}: ChatMessageProps) {
  const isUser = role === 'user';
  // Animate all "Thinking..." messages from assistant (whether loading or not)
  const isThinking = role === 'assistant' && content === 'Thinking...';

  // Get appropriate error message based on error type
  const getErrorMessage = (type: ErrorType): string => {
    switch (type) {
      case 'timeout':
        return 'The response timed out';
      case 'parsing':
        return 'Error processing AI response';
      case 'processing':
        return 'Error processing your request';
      case 'unknown':
      default:
        return 'An error occurred';
    }
  };

  // Function to get file name from URL
  const getFileName = (url: string): string => {
    const urlParts = url.split('/');
    let fileName = urlParts[urlParts.length - 1];
    
    // Remove query parameters
    if (fileName.includes('?')) {
      fileName = fileName.split('?')[0];
    }
    
    // Try to decode URI component to handle encoded characters
    try {
      fileName = decodeURIComponent(fileName);
    } catch {
      console.error('Error decoding file name');
      // If decoding fails, use the original
    }
    
    // Return the name or a default
    return fileName || 'image.png';
  };

  // Function to process message content and extract image URLs
  const processContent = (content: string) => {
    const imageRegex = /\[Attached Image\]\(([^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'image'; content: string }> = [];
    
    let lastIndex = 0;
    let match;
    
    // Find all image matches and process text between them
    while ((match = imageRegex.exec(content)) !== null) {
      // Add text before this image if there is any
      const textBefore = content.substring(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
      
      // Add the image
      parts.push({ type: 'image', content: match[1] });
      
      // Update last index
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last image
    const textAfter = content.substring(lastIndex).trim();
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
    
    // If no parts were found, treat the entire content as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }
    
    return parts;
  };
  
  const contentParts = processContent(content);
  
  return (
    <div
      className={cn(
        'flex w-full max-w-[95%] mx-auto gap-3 p-4',
        isUser ? 'bg-background' : 'bg-background',
        !showAvatar && 'pt-1', // Reduce top padding for consecutive messages
        isLoading && 'opacity-50',
        hasError && !isUser && 'border-l-2 border-l-destructive/40', // Red left border for error messages
        className
      )}
      role="listitem"
    >
      {showAvatar ? (
        <Avatar className="h-8 w-8">
          {isUser ? (
            <>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user ? (
                  user.name?.charAt(0)?.toUpperCase() ||
                  user.email?.charAt(0)?.toUpperCase() ||
                  'U'
                ) : (
                  <User className="h-4 w-4" />
                )}
              </AvatarFallback>
              <AvatarImage src={user?.imageUrl || ''} alt={user?.name || 'User'} />
            </>
          ) : (
            <div className="relative flex items-center justify-center h-full w-full">
              <AvatarFallback className="bg-muted border-primary rounded-none">
                <CircleIcon className="h-6 w-6 text-primary" />
              </AvatarFallback>
            </div>
          )}
        </Avatar>
      ) : (
        <div className="w-8" /> 
      )}
      
      <div className="flex-1 space-y-2">
        {showAvatar && ( // Only show header for first message in a sequence
          <div className="flex items-center justify-between">
            <h4>
              {isUser ? 'You' : 'AI Assistant'}
            </h4>
            <time className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
            </time>
          </div>
        )}
        
        <div className={cn(
          "prose prose-xs dark:prose-invert max-w-none text-sm [overflow-wrap:anywhere]",
          !showAvatar && "mt-0", // Remove top margin for consecutive messages
          hasError && !isUser && "text-muted-foreground" // Muted text for error messages
        )}>
          {isThinking ? (
            <p className="text-muted-foreground animate-pulse">Thinking...</p>
          ) : (
            contentParts.map((part, i) => (
              part.type === 'text' ? (
                // Render text content with line breaks
                part.content.split('\n').map((line, j) => (
                  <p key={`${i}-${j}`} className={line.trim() === '' ? 'h-4' : '[word-break:normal] [overflow-wrap:anywhere]'}>
                    {line}
                  </p>
                ))
              ) : (
                // Render image
                <div key={i} className="my-2 inline-block max-w-[400px]">
                  <div className="flex items-center gap-3 bg-card rounded-md p-2 px-3 border border-border">
                    <div className="relative w-12 h-12 rounded-sm bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      <div 
                        className="relative w-full h-full cursor-pointer"
                        onClick={() => window.open(part.content, '_blank')}
                      >
                        <Image 
                          src={part.content} 
                          alt="Attached Image" 
                          fill
                          className="object-cover"
                          sizes="(max-width: 48px) 100vw, 48px"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-card-foreground text-sm font-medium truncate max-w-[200px]">
                        {getFileName(part.content)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        76.70kB
                      </p>
                    </div>
                  </div>
                </div>
              )
            ))
          )}
          
          {/* Display file operations card inside assistant messages if operations exist */}
          {!isUser && actions && actions.length > 0 && (
            <div className="w-full">
              <AssistantActionsCard operations={actions} />
            </div>
          )}

          {/* Display error message if there's an error */}
          {!isUser && hasError && (
            <div className="mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-sm">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{getErrorMessage(errorType)}</span>
              </div>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="mt-2 px-2 py-1 text-xs bg-primary hover:bg-primary/80 text-primary-foreground rounded-md transition-colors flex items-center gap-1 w-fit"
                >
                  <RefreshCcw className="h-3 w-3" /> Regenerate response
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 