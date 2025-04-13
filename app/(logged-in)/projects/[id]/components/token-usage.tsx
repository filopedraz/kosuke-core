'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CONTEXT } from '@/lib/constants';

interface TokenUsageProps {
  tokensSent: number;
  tokensReceived: number;
  contextSize: number;
  className?: string;
}

export default function TokenUsage({
  tokensSent = 0,
  tokensReceived = 0,
  contextSize = 0,
  className,
}: TokenUsageProps) {
  // Calculate percentage of context used (max is 500k as per CONTEXT.MAX_CONTEXT_SIZE)
  const maxContextSize = CONTEXT.MAX_CONTEXT_SIZE;
  const contextPercentage = Math.min(Math.round((contextSize / maxContextSize) * 100), 100);
  
  // Format numbers to be more readable (with k suffix for thousands)
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return `${num}`;
  };
  
  // Determine progress color based on usage
  const getProgressColor = () => {
    if (contextPercentage > 95) return 'bg-destructive';
    if (contextPercentage > 80) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className={`px-4 py-2 border-b border-border bg-muted/10 text-xs ${className}`}>
      <div className="flex justify-between items-center mb-1.5">
        <div className="text-muted-foreground">
          Tokens: <span className="text-foreground font-medium">↑ {formatNumber(tokensSent)}</span>{' '}
          <span className="text-foreground font-medium">↓ {formatNumber(tokensReceived)}</span>
        </div>
        <div className="text-muted-foreground">
          Context Window: <span className="text-foreground font-medium">{formatNumber(contextSize)}</span>
          <span className="text-muted-foreground/70"> / {formatNumber(maxContextSize)}</span>
        </div>
      </div>
      <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
        <div 
          className={cn("h-full", getProgressColor())}
          style={{ width: `${contextPercentage}%` }}
        />
      </div>
    </div>
  );
} 