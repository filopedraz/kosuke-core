'use client';

import React from 'react';

import Footer from '@/components/ui/footer';
import Navbar from '@/components/ui/navbar';

export default function LoggedOutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar variant="standard" />
      <div className="flex-1 flex flex-col">
        <main className="flex flex-1 flex-col w-full pt-[60px]">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
