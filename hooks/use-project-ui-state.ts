'use client';

import { useEffect, useState } from 'react';

import type { Project } from '@/lib/db/schema';

export type ProjectView = 'preview' | 'code' | 'branding';

interface ProjectUIState {
  currentView: ProjectView;
  setCurrentView: (view: ProjectView) => void;
  isChatCollapsed: boolean;
  setIsChatCollapsed: (collapsed: boolean) => void;
  toggleChatCollapsed: () => void;
}

/**
 * Custom hook for managing project UI state (view selection and chat collapse)
 */
export function useProjectUIState(project?: Project): ProjectUIState {
  const [currentView, setCurrentView] = useState<ProjectView>('preview');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Reset view/chat state when project changes
  useEffect(() => {
    if (project) {
      setCurrentView('preview');
      setIsChatCollapsed(false);
    }
  }, [project]);

  const toggleChatCollapsed = () => {
    setIsChatCollapsed(prev => !prev);
  };

  return {
    currentView,
    setCurrentView,
    isChatCollapsed,
    setIsChatCollapsed,
    toggleChatCollapsed,
  };
}
