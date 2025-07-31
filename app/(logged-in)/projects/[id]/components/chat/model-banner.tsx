'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ModelBannerProps {
  className?: string;
}

export default function ModelBanner({ className }: ModelBannerProps) {
  const [modelInfo, setModelInfo] = useState<{
    provider: string;
    model: string;
  } | null>(null);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        const response = await fetch('/api/user/model-info');
        if (response.ok) {
          const data = await response.json();
          setModelInfo({
            provider: data.provider,
            model: data.model
          });
        }
      } catch (error) {
        console.error('Error fetching model info:', error);
      }
    };

    fetchModelInfo();
  }, []);

  if (!modelInfo) return null;

  const modelName = modelInfo.model === 'gemini-2.5-pro-exp-03-25' 
    ? 'Gemini 2.5 Pro'
    : modelInfo.model;

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