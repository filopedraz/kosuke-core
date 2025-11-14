'use client';

import Navbar from '@/components/navbar';

export default function CenteredLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar variant="standard" />
      <div className="flex-1">{children}</div>
    </>
  );
}
