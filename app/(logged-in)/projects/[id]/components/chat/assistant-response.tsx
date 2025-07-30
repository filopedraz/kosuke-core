'use client';

import { formatDistanceToNow } from 'date-fns';
import { CircleIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

// Import types
import type { AssistantResponse as AssistantResponseType } from '@/lib/types';
import ContentBlock from './content-block';

interface AssistantResponseProps {
  response: AssistantResponseType;
  className?: string;
  showTimestamp?: boolean;
}

export default function AssistantResponse({
  response,
  className,
  showTimestamp = true,
}: AssistantResponseProps) {
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());

  const handleToggleCollapse = (blockId: string) => {
    setCollapsedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  return (
    <div className={cn('w-full space-y-1', className)} role="listitem">
      {/* Header with avatar and timestamp - only show for first block */}
      {showTimestamp && response.contentBlocks.length > 0 && (
        <div className="flex w-full max-w-[95%] mx-auto gap-3 px-4">
          {/* AI Avatar */}
          <div className="relative flex items-center justify-center h-8 w-8 flex-shrink-0">
            <div className="bg-muted border-primary rounded-none flex items-center justify-center h-full w-full">
              <CircleIcon className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">AI Assistant</h4>
              <time className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(response.timestamp), { addSuffix: true })}
              </time>
            </div>
          </div>
        </div>
      )}

      {/* Content Blocks */}
      <div className="space-y-0.5">
        {response.contentBlocks.map((block, index) => (
          <ContentBlock
            key={block.id}
            contentBlock={{
              ...block,
              isCollapsed: collapsedBlocks.has(block.id) || block.isCollapsed,
            }}
            onToggleCollapse={handleToggleCollapse}
            className={cn(
              // Reduce padding for closer spacing
              index > 0 && "pt-0",
              // Add subtle visual connection between blocks
              index > 0 && "border-l-2 border-transparent ml-6 pl-2"
            )}
          />
        ))}
      </div>

      {/* Streaming indicator for the entire response */}
      {response.status === 'streaming' && (
        <div className="flex w-full max-w-[95%] mx-auto gap-3 px-4">
          <div className="w-8" /> {/* Avatar space */}
          <div className="flex-1 ml-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="italic">
                {response.contentBlocks.length === 0 ? 'Generating response' : 'Continuing'}
              </span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
