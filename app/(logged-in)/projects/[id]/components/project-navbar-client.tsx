'use client';

import Navbar from '@/components/ui/navbar';
import { useProjectStore } from '@/lib/stores/projectStore';

// Reuse the User type definition (ideally move to a shared types file)
type UserForNavbar = {
  id: number;
  name?: string;
  email: string;
  imageUrl?: string;
} | null;

interface ProjectNavbarClientProps {
  user: UserForNavbar;
}

export default function ProjectNavbarClient({ user }: ProjectNavbarClientProps) {
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
      user={user}
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