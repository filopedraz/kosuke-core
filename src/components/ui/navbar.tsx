'use client';

import { useClerk } from '@clerk/nextjs';
import {
  ArrowLeft,
  ChevronDown,
  CircleIcon,
  Code,
  Database,
  Eye,
  GitPullRequest,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useUser } from '@/hooks/use-user';

import { PrivateAlphaModal } from '@/app/(logged-out)/home/components/private-alpha-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type NavbarProps = {
  variant?: 'standard' | 'project';
  hideSignIn?: boolean;
  showNavigation?: boolean; // NEW: Show navigation items (Customers, Solutions, Blog, etc.)
  projectProps?: {
    projectName: string;
    currentView: 'preview' | 'code' | 'branding' | 'settings' | 'database';
    onViewChange: (view: 'preview' | 'code' | 'branding' | 'settings' | 'database') => void;
    onRefresh?: () => void;
    isChatCollapsed?: boolean;
    onToggleChat?: () => void;
    // NEW: Pull Request functionality
    activeChatSessionId?: number | null;
    onCreatePullRequest?: () => void;
    // Floating toggle functionality
    showSidebar?: boolean;
    onToggleSidebar?: () => void;
  };
  className?: string;
};

const solutions = [
  {
    title: 'Ship with Engineers',
    href: '/solutions/ship-with-engineers',
    description: 'Empower your engineering team to ship faster with AI-powered tools.',
  },
  {
    title: 'Enabling Collaboration',
    href: '/solutions/enabling-collaboration',
    description: 'Break down silos and enable seamless cross-functional collaboration.',
  },
  {
    title: 'Startup Program',
    href: '/solutions/startup-program',
    description: 'Ship your MVP for free with our startup program.',
  },
  {
    title: 'On Premise',
    href: '/solutions/on-premise',
    description: 'Deploy Kosuke in your own infrastructure with complete data control.',
  },
];

export default function Navbar({
  variant = 'standard',
  hideSignIn = false,
  showNavigation = false,
  projectProps,
  className,
}: NavbarProps) {
  const { clerkUser, dbUser, isLoaded, isSignedIn, imageUrl, displayName, initials } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut({ redirectUrl: '/home' });
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback redirect if signOut fails
      router.push('/home');
      router.refresh();
    }
  };

  // Render user menu or auth buttons
  const renderUserSection = () => {
    if (!isLoaded) {
      return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
    }

    if (isSignedIn && clerkUser) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-md p-0">
              <Avatar className="h-8 w-8 cursor-pointer transition-all">
                <AvatarImage src={imageUrl || undefined} alt={displayName || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{dbUser?.email}</p>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    if (hideSignIn) {
      return null;
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

  // Standard navbar for most pages
  if (variant === 'standard') {
    return (
      <>
        <div className="w-full border-b border-border relative z-50">
          <header className={cn('bg-background w-full h-14', className)}>
            <div className="w-full h-full px-6 sm:px-8 md:px-16 lg:px-24 flex justify-between items-center max-w-screen-2xl mx-auto">
              <div
                className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
                onClick={() => {
                  console.log('Kosuke logo clicked, navigating to /home');
                  router.push('/home');
                }}
              >
                <Image
                  src="/logo-dark.svg"
                  alt="Kosuke"
                  width={24}
                  height={24}
                  className="block dark:hidden"
                />
                <Image
                  src="/logo.svg"
                  alt="Kosuke"
                  width={24}
                  height={24}
                  className="hidden dark:block"
                />
                <span className="ml-2 text-xl text-foreground">Kosuke</span>
              </div>

              {/* Desktop Navigation */}
              {showNavigation && (
                <div className="hidden md:flex items-center gap-6">
                  <Link href="/customers">
                    <Button variant="ghost" size="sm">
                      Customers
                    </Button>
                  </Link>

                  {/* Solutions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Solutions
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {solutions.map(solution => (
                        <DropdownMenuItem key={solution.href} asChild>
                          <Link href={solution.href} className="cursor-pointer">
                            {solution.title}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Link href="/pricing">
                    <Button variant="ghost" size="sm">
                      Pricing
                    </Button>
                  </Link>

                  <Link href="/blog">
                    <Button variant="ghost" size="sm">
                      Blog
                    </Button>
                  </Link>

                  <a
                    href="https://form.typeform.com/to/A6zJtlUM"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      Contact Us
                    </Button>
                  </a>

                  {!isSignedIn ? (
                    <Button size="sm" onClick={() => setModalOpen(true)}>
                      Get Started
                    </Button>
                  ) : (
                    renderUserSection()
                  )}
                </div>
              )}

              {/* Mobile Menu Button */}
              {showNavigation && (
                <div className="md:hidden">
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px]">
                      <div className="flex flex-col gap-6 pt-8">
                        <Link
                          href="/customers"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-lg font-medium transition-colors hover:text-primary"
                        >
                          Customers
                        </Link>

                        {/* Solutions Accordion */}
                        <div className="space-y-3">
                          <div className="text-lg font-medium text-muted-foreground">Solutions</div>
                          <div className="ml-4 space-y-3">
                            {solutions.map(solution => (
                              <Link
                                key={solution.href}
                                href={solution.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-sm transition-colors hover:text-primary"
                              >
                                {solution.title}
                              </Link>
                            ))}
                          </div>
                        </div>

                        <Link
                          href="/pricing"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-lg font-medium transition-colors hover:text-primary"
                        >
                          Pricing
                        </Link>

                        <Link
                          href="/blog"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-lg font-medium transition-colors hover:text-primary"
                        >
                          Blog
                        </Link>

                        <a
                          href="https://form.typeform.com/to/A6zJtlUM"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-medium transition-colors hover:text-primary"
                        >
                          Contact Us
                        </a>

                        {!isSignedIn ? (
                          <Button
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setModalOpen(true);
                            }}
                          >
                            Get Started
                          </Button>
                        ) : (
                          <div onClick={() => setMobileMenuOpen(false)}>{renderUserSection()}</div>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              )}

              {/* User section (when not showing navigation) */}
              {!showNavigation && renderUserSection()}
            </div>
          </header>
        </div>

        {/* Private Alpha Modal */}
        {showNavigation && <PrivateAlphaModal open={modalOpen} onOpenChange={setModalOpen} />}
      </>
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

              {/* Floating toggle button positioned to the left of collapse toggle */}
              {/* Only show toggle when in chat interface (showSidebar is false) */}
              {projectProps.onToggleSidebar && !projectProps.showSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={projectProps.onToggleSidebar}
                  aria-label="Back to Sessions"
                  title="Back to Sessions"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}

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
                  <Button
                    variant={projectProps.currentView === 'settings' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-none px-3 h-8"
                    onClick={() => projectProps.onViewChange('settings')}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Button>
                  <Button
                    variant={projectProps.currentView === 'database' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-none px-3 h-8"
                    onClick={() => projectProps.onViewChange('database')}
                  >
                    <Database className="h-4 w-4 mr-1" />
                    Database
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4">
                {/* Create Pull Request Button */}
                {projectProps.onCreatePullRequest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={projectProps.onCreatePullRequest}
                    disabled={!projectProps.activeChatSessionId}
                    className="mr-2"
                  >
                    <GitPullRequest className="h-4 w-4 mr-1" />
                    Create PR
                  </Button>
                )}
                {renderUserSection()}
              </div>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return null;
}
