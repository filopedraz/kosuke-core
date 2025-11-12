'use client';

import { usePathname } from 'next/navigation';

import Navbar from '@/components/navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't render the navbar on project detail pages
  const isProjectDetailPage = pathname.match(/\/projects\/\d+$/);
  const isOnboardingPage = pathname === '/onboarding';

  return (
    <>
      {!isProjectDetailPage && <Navbar variant="standard" />}
      <div
        className={`${isProjectDetailPage ? 'p-0 w-full max-w-none' : isOnboardingPage ? 'flex-1' : 'container mx-auto py-6 px-4'}`}
      >
        {children}
      </div>
    </>
  );
}
