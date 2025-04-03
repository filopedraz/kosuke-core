'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LimitReachedModalProps {
  onReset: () => void;
  className?: string;
}

export default function LimitReachedModal({ onReset, className }: LimitReachedModalProps) {
  return (
    <div 
      className={cn(
        'p-5 m-4 rounded-lg border border-border bg-card shadow-lg', 
        'text-center animate-in fade-in-50 duration-300',
        className
      )}
    >
      
      <h3 className="text-lg text-foreground mb-1">
        Message Limit Reached
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        You&apos;ve reached the message limit for your current plan. 
        Upgrade to continue using premium features.
      </p>
      
      <div className="flex justify-center gap-3">
        <Button asChild>
          <Link href="/settings/billing">
            Upgrade Plan
          </Link>
        </Button>
        
        <Button 
          onClick={onReset} 
          variant="secondary"
        >
          Reset Chat
        </Button>
      </div>
    </div>
  );
} 