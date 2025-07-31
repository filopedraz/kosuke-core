'use client';

import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { renderSafeMarkdown } from '@/lib/utils/markdown';

// Import types
import type { ContentBlock as ContentBlockType } from '@/lib/types';

interface ContentBlockProps {
  contentBlock: ContentBlockType;
  onToggleCollapse?: (blockId: string) => void;
  className?: string;
}

export default function ContentBlock({
  contentBlock,
  onToggleCollapse,
  className,
}: ContentBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(contentBlock.isCollapsed ?? false);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [renderedContent, setRenderedContent] = useState<string>('');

  // Sync local state with prop changes
  useEffect(() => {
    setIsCollapsed(contentBlock.isCollapsed ?? false);
  }, [contentBlock.isCollapsed]);

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

  // Auto-collapse thinking blocks when they finish streaming
  useEffect(() => {
    if (contentBlock.type === 'thinking' && contentBlock.status === 'completed' && !isCollapsed) {
      setIsCollapsed(true);
      if (onToggleCollapse) {
        onToggleCollapse(contentBlock.id);
      }
    }
  }, [contentBlock.type, contentBlock.status, contentBlock.id, isCollapsed, onToggleCollapse]);

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
      const newCollapsed = !isCollapsed;
      setIsCollapsed(newCollapsed);
      if (onToggleCollapse) {
        onToggleCollapse(contentBlock.id);
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
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded-sm p-1 -m-1 transition-colors"
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
            <div className="pl-4 py-2 bg-muted/20 rounded-md">
              <div className="text-muted-foreground/70 text-xs leading-relaxed italic">
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
                  {/* Extract filename from tool result or show tool action */}
                  {(() => {
                    if (contentBlock.toolResult) {
                      // Try to extract filename from tool result
                      const filenameMatch = contentBlock.toolResult.match(/(?:file|path)[:=]\s*["']?([^"'\s]+)["']?/i);
                      if (filenameMatch) {
                        return filenameMatch[1].split('/').pop(); // Get just the filename
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
