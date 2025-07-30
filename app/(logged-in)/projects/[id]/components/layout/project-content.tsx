'use client';

import { useEffect, useRef } from 'react';

import { useProjectStore, type Project } from '@/lib/stores/projectStore';
import { cn } from '@/lib/utils';
import BrandGuidelines from '../brand/brand-guidelines';
import ChatInterface from '../chat/chat-interface';
import CodeExplorer from '../preview/code-explorer';
import PreviewPanel from '../preview/preview-panel';

// Import types
import type { ChatMessage } from '@/lib/types';

interface ProjectContentProps {
  projectId: number;
  project: Project;
  isNewProject?: boolean;
  initialMessages: ChatMessage[];
}

export default function ProjectContent({
  projectId,
  project,
  isNewProject = false,
  initialMessages,
}: ProjectContentProps) {
  // Select individual state pieces for stability
  const currentView = useProjectStore(state => state.currentView);
  const isChatCollapsed = useProjectStore(state => state.isChatCollapsed);
  const setCurrentProject = useProjectStore(state => state.setCurrentProject);

  // Reference to the ChatInterface component to maintain its state
  const chatInterfaceRef = useRef<HTMLDivElement>(null);

  // Set the current project in the store when the component mounts or project changes
  useEffect(() => {
    setCurrentProject(project);
    // Optionally reset view/chat state when project changes
    useProjectStore.setState({ currentView: 'preview', isChatCollapsed: false });
  }, [project, setCurrentProject]);

  return (
    <div className={cn('flex h-[calc(100vh-3.5rem)] w-full overflow-hidden')}>
      <div
        ref={chatInterfaceRef}
        className={cn(
          "h-full overflow-hidden flex flex-col",
          // Remove transition effects that cause messages to appear gradually
          isChatCollapsed ? "w-0 opacity-0" : "w-full md:w-1/3 lg:w-1/4"
        )}
        style={{
          // Use visibility instead of conditional rendering
          visibility: isChatCollapsed ? 'hidden' : 'visible',
          // Use display to properly hide when collapsed
          display: isChatCollapsed ? 'none' : 'flex'
        }}
      >
        {/* Always render the ChatInterface but hide it with CSS */}
                <ChatInterface
          projectId={projectId}
          initialMessages={initialMessages}
          isLoading={false} // Explicitly set to false since we have initial data
        />
      </div>

      <div
        className={cn(
          "h-full flex-col overflow-hidden border rounded-md border-border",
          // Remove transitions from this element as well
          isChatCollapsed ? "w-full" : "hidden md:flex md:w-2/3 lg:w-3/4"
        )}
      >
        {currentView === 'preview' ? (
          <PreviewPanel
            projectId={projectId}
            projectName={project.name}
            initialLoading={isNewProject}
          />
        ) : currentView === 'code' ? (
          <CodeExplorer
            projectId={projectId}
          />
        ) : (
          <BrandGuidelines
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
}
