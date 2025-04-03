'use client';

import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ProjectLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  isChatCollapsed?: boolean;
  className?: string;
}

export default function ProjectLayout({
  leftPanel,
  rightPanel,
  isChatCollapsed = false,
  className,
}: ProjectLayoutProps) {
  return (
    <div className={cn('flex h-[calc(100vh-3.5rem)] w-full overflow-hidden', className)}>
      {/* Left Panel - Chat Interface */}
      <div 
        className={cn(
          "h-full overflow-hidden flex flex-col",
          isChatCollapsed ? "w-0" : "w-full md:w-1/3 lg:w-1/4"
        )}
      >
        {leftPanel}
      </div>
      
      {/* Right Panel - Preview/Code Explorer */}
      <div 
        className={cn(
          "h-full flex-col overflow-hidden border border-border rounded-md",
          isChatCollapsed ? "w-full" : "hidden md:flex md:w-2/3 lg:w-3/4"
        )}
      >
        {rightPanel}
      </div>
    </div>
  );
} 