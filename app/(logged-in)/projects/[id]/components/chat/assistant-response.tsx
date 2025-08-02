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
  // Track user's explicit choices for each block (blockId -> isCollapsed)
  const [userChoices, setUserChoices] = useState<Map<string, boolean>>(new Map());
  // Track which blocks user has manually interacted with
  const [userInteractedBlocks, setUserInteractedBlocks] = useState<Set<string>>(new Set());

      const handleToggleCollapse = (blockId: string, isUserInitiated: boolean = true) => {
    // Track user interactions
    if (isUserInitiated) {
      setUserInteractedBlocks(prev => new Set(prev).add(blockId));
    }

    setUserChoices(prev => {
      const newMap = new Map(prev);
      const currentBlock = response.contentBlocks.find(block => block.id === blockId);
      const currentState = newMap.has(blockId)
        ? newMap.get(blockId)!
        : (currentBlock?.isCollapsed ?? false);

      // Toggle the current state
      newMap.set(blockId, !currentState);
      return newMap;
    });
  };

  return (
    <div className={cn('w-full space-y-3', className)}>
      {/* Content Blocks */}
      {response.contentBlocks.map((block) => {
        // If user has made an explicit choice, use that. Otherwise use original state.
        const isCollapsed = userChoices.has(block.id)
          ? userChoices.get(block.id)!
          : (block.isCollapsed ?? false);



        return (
          <ContentBlock
            key={block.id}
            contentBlock={{
              ...block,
              isCollapsed,
            }}
            onToggleCollapse={handleToggleCollapse}
            userHasInteracted={userInteractedBlocks.has(block.id)}
            className="w-full"
          />
        );
      })}

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
