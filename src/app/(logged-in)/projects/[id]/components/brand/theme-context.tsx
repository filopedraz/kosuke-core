'use client';

import { createContext, ReactNode, useState } from 'react';

// Define theme modes
export type ThemeMode = 'light' | 'dark';

// Create a context for the theme preview
 const ThemePreviewContext = createContext<{
  previewMode: ThemeMode;
  togglePreviewMode: () => void;
}>({
  previewMode: 'light',
  togglePreviewMode: () => {},
});

interface ThemePreviewProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

export function ThemePreviewProvider({
  children,
  initialMode = 'light'
}: ThemePreviewProviderProps) {
  const [previewMode, setPreviewMode] = useState<ThemeMode>(initialMode);

  const togglePreviewMode = () => {
    setPreviewMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemePreviewContext.Provider value={{ previewMode, togglePreviewMode }}>
      <div className={`h-full overflow-auto ${previewMode === 'dark' ? 'dark' : ''}`}>
        {children}
      </div>
    </ThemePreviewContext.Provider>
  );
}
