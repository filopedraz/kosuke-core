'use client';

import Navbar from '@/components/ui/navbar';

type SharedLayoutProps = {
  children: React.ReactNode;
  showNavbar?: boolean;
  variant?: 'standard' | 'project';
  projectProps?: {
    projectName: string;
    currentView: 'preview' | 'code';
    onViewChange: (view: 'preview' | 'code') => void;
    onRefresh?: () => void;
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
