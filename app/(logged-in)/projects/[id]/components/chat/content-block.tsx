'use client';

import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { renderSafeMarkdown } from '@/lib/utils/markdown';

// Import types
import type { ContentBlock as ContentBlockType } from '@/lib/types';

interface ContentBlockProps {
  contentBlock: ContentBlockType;
  onToggleCollapse?: (blockId: string, isUserInitiated?: boolean) => void;
  userHasInteracted?: boolean;
  className?: string;
}

export default function ContentBlock({
  contentBlock,
  onToggleCollapse,
  userHasInteracted = false,
  className,
}: ContentBlockProps) {
  // Remove local state - use prop state directly
  const isCollapsed = contentBlock.isCollapsed ?? false;
  const [thinkingTime, setThinkingTime] = useState(0);
  const [renderedContent, setRenderedContent] = useState<string>('');

  // Timer for thinking blocks
  useEffect(() => {
    if (contentBlock.type === 'thinking') {
      // Calculate initial time based on timestamp
      const now = new Date().getTime();
      const startTime = contentBlock.timestamp.getTime();
      const initialSeconds = Math.floor((now - startTime) / 1000);
      setThinkingTime(initialSeconds);

      if (contentBlock.status === 'streaming') {
        const interval = setInterval(() => {
          setThinkingTime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
      }
    }
  }, [contentBlock.type, contentBlock.status, contentBlock.timestamp]);

  // Auto-collapse thinking blocks when they finish streaming (only if user hasn't manually interacted)
  useEffect(() => {
    if (contentBlock.type === 'thinking' && contentBlock.status === 'completed' && !isCollapsed && !userHasInteracted) {
      if (onToggleCollapse) {
        onToggleCollapse(contentBlock.id, false); // false = not user initiated
      }
    }
  }, [contentBlock.type, contentBlock.status, contentBlock.id, userHasInteracted, isCollapsed, onToggleCollapse]);

  // Render markdown content for text blocks
  useEffect(() => {
    if (contentBlock.type === 'text') {
      const renderContent = async () => {
        try {
          const rendered = await renderSafeMarkdown(contentBlock.content);
          setRenderedContent(rendered);
        } catch (error) {
          console.error('Error rendering markdown:', error);
          // Fallback to plain text with line breaks
          setRenderedContent(contentBlock.content.replace(/\n/g, '<br>'));
        }
      };

      renderContent();
    }
  }, [contentBlock.type, contentBlock.content]);

  const handleToggleCollapse = () => {
    if (contentBlock.type === 'thinking') {
      if (onToggleCollapse) {
        onToggleCollapse(contentBlock.id, true); // true = user initiated
      }
    }
  };

  // Thinking block rendering
  if (contentBlock.type === 'thinking') {
    return (
      <div className={cn('w-full', className)}>
        {/* Thinking Content */}
        <div className="space-y-2">
          <div
            className="flex items-center gap-2 cursor-pointer rounded-sm p-1 -m-1"
            onClick={handleToggleCollapse}
          >
            <span className="text-xs font-medium text-muted-foreground/80 tracking-wide">
              Thought for {thinkingTime}s
            </span>
            {contentBlock.status === 'streaming' ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/60" />
            ) : (
              <>
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                )}
              </>
            )}
          </div>

          {!isCollapsed && (
            <div className="pl-2 py-2">
              <div className="text-muted-foreground/70 text-xs leading-relaxed">
                {contentBlock.content.split('\n').map((line, j) => (
                  <p key={j} className={line.trim() === '' ? 'h-3' : '[word-break:normal] [overflow-wrap:anywhere]'}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tool block rendering
  if (contentBlock.type === 'tool') {
    return (
      <div className={cn('w-full', className)}>
        {/* Tool Content */}
        <div className="space-y-2">
          <div className="bg-muted/30 border border-border/50 rounded-md p-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <div className="flex-shrink-0">
                  {contentBlock.status === 'streaming' ? (
                    <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                  ) : contentBlock.status === 'error' ? (
                    <div className="h-3.5 w-3.5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">✗</span>
                    </div>
                  ) : (
                    <div className="h-3.5 w-3.5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">✓</span>
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <div className="font-medium text-foreground truncate">
                    {contentBlock.toolName?.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim() || 'Tool'}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2 text-right">
                <div className={cn(
                  "text-[10px] font-medium text-muted-foreground"
                )}>
                  {/* Extract filename from tool input */}
                  {(() => {
                    // First priority: check tool input for file_path
                    if (contentBlock.toolInput && 'file_path' in contentBlock.toolInput) {
                      const filePath = contentBlock.toolInput.file_path as string;
                      return filePath.split('/').pop(); // Get just the filename
                    }

                    // Second priority: extract from tool result for backward compatibility
                    if (contentBlock.toolResult) {
                      // Pattern 1: "The file [file_path] has been updated/created/read" - Claude Code SDK format
                      const fileMatch = contentBlock.toolResult.match(/The file\s+([^\s]+)\s+has been/i);
                      if (fileMatch) {
                        const filePath = fileMatch[1].trim();
                        return filePath.split('/').pop(); // Get just the filename
                      }

                      // Pattern 2: "Successfully [action] [file_path]" - legacy format
                      const successMatch = contentBlock.toolResult.match(/Successfully\s+(?:edited|read|created|deleted)\s+(.+?)(?:\s|$)/i);
                      if (successMatch) {
                        const filePath = successMatch[1].trim();
                        return filePath.split('/').pop(); // Get just the filename
                      }

                      // Pattern 3: "[action] file: [file_path]"
                      const actionMatch = contentBlock.toolResult.match(/(?:file|path)[:=]\s*["']?([^"'\s]+)["']?/i);
                      if (actionMatch) {
                        return actionMatch[1].split('/').pop(); // Get just the filename
                      }

                      // Pattern 4: Look for any file-like path (contains . and /)
                      const pathMatch = contentBlock.toolResult.match(/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.\/-]+\.[a-zA-Z0-9]+)/);
                      if (pathMatch) {
                        return pathMatch[1].split('/').pop(); // Get just the filename
                      }
                    }

                    // Fallback to tool name processing
                    const toolAction = contentBlock.toolName?.replace(/_/g, ' ') || 'Tool';
                    return toolAction;
                  })()}
                </div>
              </div>
            </div>

            {/* Progress bar for streaming tools */}
            {contentBlock.status === 'streaming' && (
              <div className="mt-2 w-full bg-muted-foreground/20 rounded-full h-1">
                <div className="bg-muted-foreground/60 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            )}


          </div>
        </div>
      </div>
    );
  }

  // Text block rendering with markdown support
  return (
    <div className={cn('w-full', className)}>
      {/* Text Content */}
      <div className="space-y-2 w-full">
        <div className="w-full max-w-full text-sm text-foreground [overflow-wrap:anywhere] [&>*]:max-w-full [&>pre]:w-full [&>pre]:max-w-full">
          {renderedContent ? (
            <div
              className="w-full max-w-full"
              dangerouslySetInnerHTML={{
                __html: renderedContent
              }}
            />
          ) : (
            // Loading state or fallback for when content is being rendered
            <div className="w-full max-w-full">
              {contentBlock.content.split('\n').map((line, j) => (
                <p key={j} className={line.trim() === '' ? 'h-4' : '[word-break:normal] [overflow-wrap:anywhere]'}>
                  {line}
                </p>
              ))}
            </div>
          )}
          {/* Streaming cursor for text blocks */}
          {contentBlock.status === 'streaming' && contentBlock.content.trim() !== '' && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
