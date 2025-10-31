import React from 'react';

import Footer from '@/components/footer';
import Navbar from '@/components/ui/navbar';

export default function LoggedOutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar variant="standard" showNavigation={true} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
