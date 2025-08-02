'use client';

import Navbar from '@/components/ui/navbar';
import { useProjectStore } from '@/lib/stores/projectStore';

export default function ProjectNavbar() {
  // Select individual state pieces for stability
  const currentProject = useProjectStore(state => state.currentProject);
  const currentView = useProjectStore(state => state.currentView);
  const isChatCollapsed = useProjectStore(state => state.isChatCollapsed);
  const setCurrentView = useProjectStore(state => state.setCurrentView);
  const toggleChatCollapsed = useProjectStore(state => state.toggleChatCollapsed);

  // Handle potential null project - Navbar might need defaults or conditional rendering
  const projectName = currentProject?.name || 'Loading Project...'; // Provide a default name

  // Refresh handler (can be implemented or passed from store if needed)
  const handleRefresh = () => {
    console.log('Refresh functionality not implemented in ProjectNavbarClient');
    // Potentially trigger a refetch action in the store if required
  };

    return (
    <Navbar
      variant="project"
      projectProps={{
        projectName: projectName,
        currentView: currentView,
        onViewChange: setCurrentView, // Directly pass the store action
        onRefresh: handleRefresh,      // Pass the local handler
        isChatCollapsed: isChatCollapsed,
        onToggleChat: toggleChatCollapsed, // Directly pass the store action
      }}
    />
  );
}
