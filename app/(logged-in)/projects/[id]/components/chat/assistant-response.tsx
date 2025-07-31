'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

// Import types
import type { AssistantResponse as AssistantResponseType } from '@/lib/types';
import ContentBlock from './content-block';

interface AssistantResponseProps {
  response: AssistantResponseType;
  className?: string;
}

export default function AssistantResponse({
  response,
  className,
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
    <div className={cn('w-full space-y-0.5', className)}>
      {/* Content Blocks */}
      {response.contentBlocks.map((block) => (
        <ContentBlock
          key={block.id}
          contentBlock={{
            ...block,
            isCollapsed: collapsedBlocks.has(block.id) || block.isCollapsed,
          }}
          onToggleCollapse={handleToggleCollapse}
          className="w-full"
        />
      ))}

      {/* Streaming indicator */}
      {response.status === 'streaming' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce"></div>
          </div>
        </div>
      )}
    </div>
  );
}
