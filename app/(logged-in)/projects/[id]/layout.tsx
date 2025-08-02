import { ReactNode } from 'react';

import ProjectNavbar from './components/layout/project-navbar';

export default function ProjectDetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full">
      <ProjectNavbar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
