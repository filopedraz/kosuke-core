'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { SUBSCRIPTION_TIERS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ModelBannerProps {
  className?: string;
}

export default function ModelBanner({ className }: ModelBannerProps) {
  const [modelInfo, setModelInfo] = useState<{
    provider: string;
    model: string;
    tier: string;
    messageCount?: number;
    messageLimit?: number;
  } | null>(null);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        const response = await fetch('/api/user/model-info');
        if (response.ok) {
          const data = await response.json();
          setModelInfo(data);
        }
      } catch (error) {
        console.error('Error fetching model info:', error);
      }
    };

    fetchModelInfo();
  }, []);

  if (!modelInfo) return null;

  const isFree = modelInfo.tier === SUBSCRIPTION_TIERS.FREE;
  
  const modelName = modelInfo.model === 'gemini-2.5-pro-exp-03-25' 
    ? 'Gemini 2.5 Pro'
    : modelInfo.model;

  const usageInfo = modelInfo.messageCount !== undefined && modelInfo.messageLimit !== undefined
    ? `${modelInfo.messageCount}/${modelInfo.messageLimit} messages`
    : '';

  return (
    <div className={cn('px-4', className)}>
      {isFree ? (
        <Link href="/billing" className="w-full">
          <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-md bg-gradient-to-r from-muted/40 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-colors group">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Using:</span>
                <span className="text-xs font-medium">{modelName}</span>
              </div>
              {usageInfo && (
                <span className="text-xs text-muted-foreground">{usageInfo}</span>
              )}
            </div>
            <div className="flex items-center text-primary">
              <span className="text-xs font-medium group-hover:underline">Upgrade for More Messages</span>
              <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-md bg-gradient-to-r from-primary/5 to-background">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Powered by:</span>
              <span className="text-xs font-medium">{modelName}</span>
            </div>
            {usageInfo && (
              <span className="text-xs text-muted-foreground">{usageInfo}</span>
            )}
          </div>
          <div className="flex items-center text-primary/80">
            <Sparkles className="h-3 w-3 mr-1" />
            <span className="text-xs font-medium">Premium</span>
          </div>
        </div>
      )}
    </div>
  );
} 