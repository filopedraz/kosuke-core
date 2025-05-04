'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

import Footer from '@/components/ui/footer';
import Navbar from '@/components/ui/navbar';

export default function LoggedOutLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWaitlistPage = pathname.includes('/waitlist');
  const navbarVariant = isWaitlistPage ? 'waitlist' : 'standard';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar variant={navbarVariant} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex flex-col items-center p-4 pt-20 md:px-24 pb-0">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
