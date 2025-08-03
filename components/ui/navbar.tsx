'use client';

import { useClerk } from '@clerk/nextjs';
import {
  CircleIcon,
  Code,
  Eye,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useUser } from '@/hooks/use-user';

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

// Modern animated hamburger menu icon component
function HamburgerIcon({ 
  isOpen, 
  className 
}: { 
  isOpen: boolean; 
  className?: string; 
}) {
  return (
    <div className={cn("w-5 h-5 flex flex-col justify-center items-center", className)}>
      <div className="w-full h-[2px] bg-current rounded-full relative">
        <div 
          className={cn(
            "absolute inset-0 bg-current rounded-full transition-all duration-300 ease-in-out",
            isOpen ? "rotate-45 translate-y-0" : "rotate-0 -translate-y-1.5"
          )}
        />
        <div 
          className={cn(
            "absolute inset-0 bg-current rounded-full transition-all duration-300 ease-in-out",
            isOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
          )}
        />
        <div 
          className={cn(
            "absolute inset-0 bg-current rounded-full transition-all duration-300 ease-in-out",
            isOpen ? "-rotate-45 translate-y-0" : "rotate-0 translate-y-1.5"
          )}
        />
      </div>
    </div>
  );
}

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
  const { clerkUser, isLoaded, isSignedIn, imageUrl, displayName, initials } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  const renderUserSection = () => {
    if (!isLoaded) {
      return <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />;
    }

    if (!isSignedIn) {
      return (
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Sign Up
          </Link>
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={imageUrl} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {displayName && <p className="font-medium">{displayName}</p>}
              {clerkUser?.primaryEmailAddress && (
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  {clerkUser.primaryEmailAddress.emailAddress}
                </p>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/projects" className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Waitlist variant
  if (variant === 'waitlist') {
    return (
      <div className="w-full">
        <header className={cn('w-full h-14 flex items-center bg-background', className)}>
          <div className="container mx-auto flex justify-between items-center px-4">
            <Link href="/" className="flex items-center">
              <CircleIcon className="h-6 w-6 text-primary" />
              <span className="ml-2 text-lg font-semibold">Kosuke</span>
            </Link>
            {renderUserSection()}
          </div>
        </header>
      </div>
    );
  }

  // Standard variant
  if (variant === 'standard') {
    return (
      <div className="w-full">
        <header className={cn('w-full h-14 flex items-center bg-background', className)}>
          <div className="container mx-auto flex justify-between items-center px-4">
            <Link href="/" className="flex items-center">
              <CircleIcon className="h-6 w-6 text-primary" />
              <span className="ml-2 text-lg font-semibold">Kosuke</span>
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
                  className="absolute right-0 mr-2 h-8 w-8 hover:bg-muted/50 transition-colors"
                  aria-label={projectProps.isChatCollapsed ? 'Open chat panel' : 'Close chat panel'}
                  title={projectProps.isChatCollapsed ? 'Open chat panel' : 'Close chat panel'}
                >
                  <HamburgerIcon 
                    isOpen={!projectProps.isChatCollapsed} 
                    className="text-foreground"
                  />
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
