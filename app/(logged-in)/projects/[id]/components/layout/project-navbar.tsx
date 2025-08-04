'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

import Navbar from '@/components/ui/navbar';
import { useProject } from '@/hooks/use-projects';

export default function ProjectNavbar() {
  // Get project ID from URL params
  const params = useParams();
  const projectId = Number(params.id);

  // Fetch project data
  const { data: project } = useProject(projectId);

  // Local UI state
  const [currentView, setCurrentView] = useState<'preview' | 'code' | 'branding'>('preview');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Handlers
  const handleRefresh = () => {
    // Refresh could trigger a page reload or refetch project data
    window.location.reload();
  };

  const toggleChatCollapsed = () => {
    setIsChatCollapsed(prev => !prev);
  };

  return (
    <Navbar
      variant="project"
      projectProps={{
        projectName: project?.name || 'Loading Project...',
        currentView: currentView,
        onViewChange: setCurrentView,
        onRefresh: handleRefresh,
        isChatCollapsed: isChatCollapsed,
        onToggleChat: toggleChatCollapsed,
      }}
    />
  );
}
