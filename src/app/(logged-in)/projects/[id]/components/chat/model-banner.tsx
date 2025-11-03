'use client';

import { cn } from '@/lib/utils';
import { GitBranch } from 'lucide-react';

interface ModelBannerProps {
  className?: string;
  currentBranch?: string; // NEW: Display current branch
  chatSessionId?: number | null; // NEW: Track active session
}

export default function ModelBanner({ className, currentBranch, chatSessionId }: ModelBannerProps) {
  // Get model name from environment variable
  const model = process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'claude-haiku-4-5';

  // Format model name for display
  const getModelDisplayName = (modelId: string) => {
    if (modelId.includes('claude-3-7-sonnet')) return 'Claude 3.7 Sonnet';
    if (modelId.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
    if (modelId.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro';
    if (modelId.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
    return modelId; // fallback to raw model ID
  };

  const modelName = getModelDisplayName(model);

  // Determine branch to display
  const displayBranch = currentBranch || 'main';

  return (
    <div className={cn('px-4', className)}>
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-md bg-gradient-to-r from-primary/5 to-background">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Powered by:</span>
          <span className="text-xs font-medium">{modelName}</span>
        </div>

        {/* Branch Display */}
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {displayBranch}
          </span>
          {!chatSessionId && (
            <span className="text-xs text-muted-foreground/70">(default)</span>
          )}
        </div>
      </div>
    </div>
  );
}
