'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import {
  CircleIcon,
  Code,
  CreditCard,
  Eye,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { useUserProfileImage } from '@/hooks/use-user-profile-image';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function Navbar({ variant = 'standard', projectProps, className }: NavbarProps) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { imageUrl: profileImageUrl } = useUserProfileImage();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      // Always redirect and refresh regardless of success/failure
      router.push('/');
      router.refresh();
    }
  };

  // Render user menu or auth buttons
  const renderUserSection = () => {
    if (!isLoaded) {
      return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />;
    }

    if (isSignedIn && user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-md p-0">
              <Avatar className="h-8 w-8 cursor-pointer transition-all">
                <AvatarImage src={profileImageUrl} alt={user.fullName || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.fullName?.charAt(0)?.toUpperCase() ||
                    user.primaryEmailAddress?.emailAddress?.charAt(0)?.toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{user.fullName || 'User'}</p>
                <p className="text-xs text-muted-foreground">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/projects')} className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Projects</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/billing')} className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      <div className="w-full">
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
