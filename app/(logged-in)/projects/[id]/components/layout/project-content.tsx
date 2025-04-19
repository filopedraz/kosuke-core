'use client';

import { useEffect } from 'react';

import ChatInterface from '../chat/chat-interface';
import CodeExplorer from '../preview/code-explorer';
import PreviewPanel from '../preview/preview-panel';
import { useProjectStore, type Project } from '@/lib/stores/projectStore';
import { cn } from '@/lib/utils';

// Keep ChatMessage type for component's internal use/props
interface ChatMessage {
  id: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

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
  
  // Set the current project in the store when the component mounts or project changes
  useEffect(() => {
    setCurrentProject(project);
    // Optionally reset view/chat state when project changes
    // useProjectStore.setState({ currentView: 'preview', isChatCollapsed: false });
  }, [project, setCurrentProject]);
  
  return (
    <div className={cn('flex h-[calc(100vh-3.5rem)] w-full overflow-hidden')}>
      <div 
        className={cn(
          "h-full overflow-hidden flex flex-col transition-all duration-300 ease-in-out",
          isChatCollapsed ? "w-0 opacity-0" : "w-full md:w-1/3 lg:w-1/4"
        )}
      >
        {!isChatCollapsed && (
          <ChatInterface 
            projectId={projectId}
            initialMessages={initialMessages}
          />
        )}
      </div>
      
      <div 
        className={cn(
          "h-full flex-col overflow-hidden border rounded-md border-border transition-all duration-300 ease-in-out",
          isChatCollapsed ? "w-full" : "hidden md:flex md:w-2/3 lg:w-3/4"
        )}
      >
        {currentView === 'preview' ? (
          <PreviewPanel
            projectId={projectId}
            projectName={project.name}
            initialLoading={isNewProject}
          />
        ) : (
          <CodeExplorer
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
} 