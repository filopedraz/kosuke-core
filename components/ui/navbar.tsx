'use client';

import {
  LogOut,
  Settings,
  LayoutDashboard,
  Code,
  Eye,
  CircleIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { signOut } from '@/app/(logged-out)/actions';
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

type User = {
  id?: number;
  name?: string;
  email: string;
  imageUrl?: string;
  subscription?: {
    tier: string;
  };
} | null;

type NavbarProps = {
  user?: User;
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
  user,
  variant = 'standard',
  projectProps,
  className,
}: NavbarProps) {
  const [isUpgradable, setIsUpgradable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const response = await fetch('/api/subscription/status');
        const data = await response.json();
        setIsUpgradable(data.isUpgradable);
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Always redirect and refresh regardless of success/failure
      router.push('/');
      router.refresh();
    }
  };

  // Render user menu or auth buttons
  const renderUserSection = () => {
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-md p-0">
              <Avatar className="h-8 w-8 cursor-pointer transition-all">
                <AvatarImage src={user.imageUrl || ''} alt={user.name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user.name?.charAt(0)?.toUpperCase() ||
                    user.email?.charAt(0)?.toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{user.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
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
            {isUpgradable ? (
              <DropdownMenuItem onClick={() => router.push('/billing')} className="cursor-pointer">
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Upgrade Plan</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => router.push('/billing')} className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </DropdownMenuItem>
            )}
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
