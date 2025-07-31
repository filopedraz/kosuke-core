'use client';

import { cn } from '@/lib/utils';

interface ModelBannerProps {
  className?: string;
}

export default function ModelBanner({ className }: ModelBannerProps) {
  // Get model name from environment variable
  const model = process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'claude-3-7-sonnet-20250219';

  // Format model name for display
  const getModelDisplayName = (modelId: string) => {
    if (modelId.includes('claude-3-7-sonnet')) return 'Claude 3.7 Sonnet';
    if (modelId.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
    if (modelId.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro';
    if (modelId.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
    return modelId; // fallback to raw model ID
  };

  const modelName = getModelDisplayName(model);

  return (
    <div className={cn('px-4', className)}>
      <div className="flex items-center w-full px-4 py-2.5 rounded-md bg-gradient-to-r from-primary/5 to-background">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Powered by:</span>
          <span className="text-xs font-medium">{modelName}</span>
        </div>
      </div>
    </div>
  );
}
