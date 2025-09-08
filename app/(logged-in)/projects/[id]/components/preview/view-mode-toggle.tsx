'use client';

import { Monitor, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PreviewViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ViewModeToggleProps {
  viewMode: PreviewViewMode;
  onViewModeChange: (mode: PreviewViewMode) => void;
  disabled?: boolean;
  className?: string;
}

export default function ViewModeToggle({
  viewMode,
  onViewModeChange,
  disabled = false,
  className,
}: ViewModeToggleProps) {
  return (
    <div className={cn('flex items-center border rounded-md p-1', className)}>
      <Button
        variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('desktop')}
        disabled={disabled}
        className={cn(
          'h-6 px-2 text-xs',
          viewMode === 'desktop' && 'bg-secondary text-secondary-foreground'
        )}
        aria-label="Desktop view"
        title="Desktop view"
      >
        <Monitor className="h-3 w-3" />
      </Button>
      <Button
        variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('mobile')}
        disabled={disabled}
        className={cn(
          'h-6 px-2 text-xs',
          viewMode === 'mobile' && 'bg-secondary text-secondary-foreground'
        )}
        aria-label="Mobile view"
        title="Mobile view"
      >
        <Smartphone className="h-3 w-3" />
      </Button>
    </div>
  );
}
