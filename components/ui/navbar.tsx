'use client';

import {
  Code,
  Eye,
  CircleIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NavbarProps = {
  variant?: 'standard' | 'project' | 'waitlist';
  projectProps?: {
    projectName: string;
    currentView: 'preview' | 'code' | 'branding';
    onViewChange: (view: 'preview' | 'code' | 'branding') => void;
    onRefresh?: () => void;
    isChatCollapsed?: boolean;
    onToggleChat?: () => void;
  };
  className?: string;
};

export default function Navbar({
  variant = 'standard',
  projectProps,
  className,
}: NavbarProps) {
  const { user, isLoaded, isSignedIn } = useUser();

  // Render user menu or auth buttons
  const renderUserSection = () => {
    if (!isLoaded) {
      return (
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
      );
    }

    if (isSignedIn && user) {
      return (
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
              userButtonPopoverCard: 'bg-gray-900 border-gray-800',
              userButtonPopoverActions: 'bg-gray-900',
            },
          }}
          afterSignOutUrl="/"
        />
      );
    }

    return (
      <div className="flex items-center space-x-4">
        <Link href="/sign-in">
          <Button variant="default" size="sm">
            Sign In
          </Button>
        </Link>
      </div>
    );
  };

  // Waitlist navbar variant
  if (variant === 'waitlist') {
    return (
      <div className="w-full border-b border-border">
        <header className={cn('bg-background w-full h-14', className)}>
          <div className="w-full h-full px-6 sm:px-8 md:px-16 lg:px-24 flex justify-between items-center max-w-screen-2xl mx-auto">
            <Link href="/" className="flex items-center">
              <CircleIcon className="h-6 w-6 text-primary" />
              <span className="ml-2 text-xl text-foreground">Kosuke</span>
            </Link>
          </div>
        </header>
      </div>
    );
  }

  // Standard navbar for most pages
  if (variant === 'standard') {
    return (
      <div className="w-full border-b border-border">
        <header className={cn('bg-background w-full h-14', className)}>
          <div className="w-full h-full px-6 sm:px-8 md:px-16 lg:px-24 flex justify-between items-center max-w-screen-2xl mx-auto">
            <Link href="/" className="flex items-center">
              <CircleIcon className="h-6 w-6 text-primary" />
              <span className="ml-2 text-xl text-foreground">Kosuke</span>
            </Link>
            {renderUserSection()}
          </div>
        </header>
      </div>
    );
  }

  // Project variant
  if (variant === 'project' && projectProps) {
    return (
      <div className="w-full border-b border-border">
        <header className={cn('w-full h-14 flex items-center bg-background', className)}>
          <div className="flex w-full h-full">
            {/* Left section - matches chat width */}
            <div className="flex items-center h-full w-full md:w-1/3 lg:w-1/4 border-r border-transparent relative">
              <div className="px-4 flex items-center">
                <Link href="/" className="flex items-center">
                  <CircleIcon className="h-6 w-6 text-primary" />
                </Link>
              </div>

              {/* Toggle button positioned at the right edge of chat width */}
              {projectProps.onToggleChat && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={projectProps.onToggleChat}
                  className="absolute right-0 mr-2 h-8 w-8"
                  aria-label={projectProps.isChatCollapsed ? 'Expand chat' : 'Collapse chat'}
                  title={projectProps.isChatCollapsed ? 'Expand chat' : 'Collapse chat'}
                >
                  {projectProps.isChatCollapsed ? (
                    <PanelLeftOpen className="h-5 w-5" />
                  ) : (
                    <PanelLeftClose className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>

            {/* Right section - project title and controls */}
            <div className="flex-1 flex items-center justify-between">
              <h2 className="text-sm font-medium truncate max-w-[200px] ml-4">
                {projectProps.projectName}
              </h2>

              <div className="flex items-center gap-2 mx-auto">
                <div className="flex border border-input rounded-md overflow-hidden">
                  <Button
                    variant={projectProps.currentView === 'preview' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-none px-3 h-8"
                    onClick={() => projectProps.onViewChange('preview')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant={projectProps.currentView === 'code' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-none px-3 h-8"
                    onClick={() => projectProps.onViewChange('code')}
                  >
                    <Code className="h-4 w-4 mr-1" />
                    Code
                  </Button>
                  <Button
                    variant={projectProps.currentView === 'branding' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-none px-3 h-8"
                    onClick={() => projectProps.onViewChange('branding')}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Branding
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4">{renderUserSection()}</div>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return null;
}
