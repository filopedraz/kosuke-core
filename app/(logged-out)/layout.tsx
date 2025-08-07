'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

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
        <main className="flex flex-1 flex-col w-full pt-[60px]">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
