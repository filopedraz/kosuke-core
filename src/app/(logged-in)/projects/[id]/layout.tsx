import { ReactNode } from 'react';

export default function ProjectDetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full">
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
