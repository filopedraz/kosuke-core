'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import Footer from '@/components/ui/footer';
import Navbar from '@/components/ui/navbar';

export default function LoggedOutLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/home';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar variant="standard" hideSignIn={isHomePage} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
