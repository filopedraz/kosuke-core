'use client';

import Navbar from '@/components/ui/navbar';

type SharedLayoutProps = {
  children: React.ReactNode;
  showNavbar?: boolean;
  variant?: 'standard' | 'project';
  projectProps?: {
    projectName: string;
    currentView: 'preview' | 'code' | 'branding' | 'settings' | 'database';
    onViewChange: (view: 'preview' | 'code' | 'branding' | 'settings' | 'database') => void;
    onRefresh?: () => void;
    isChatCollapsed?: boolean;
    onToggleChat?: () => void;
    activeChatSessionId?: string | null;
    onCreatePullRequest?: () => void;
    showSidebar?: boolean;
    onToggleSidebar?: () => void;
  };
};

export default function SharedLayout({
  children,
  showNavbar = true,
  variant = 'standard',
  projectProps,
}: SharedLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {showNavbar && <Navbar variant={variant} projectProps={projectProps} />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
