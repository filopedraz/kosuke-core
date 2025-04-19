'use client';

import { useEffect } from 'react';

import ChatInterface from './chat-interface';
import CodeExplorer from './code-explorer';
import PreviewPanel from './preview-panel';
import ProjectLayout from './project-layout';
import { useProjectStore, type Project } from '@/lib/stores/projectStore';

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
    <div className="flex-1 overflow-hidden">
      <ProjectLayout
        leftPanel={
          <ChatInterface 
            projectId={projectId}
            initialMessages={initialMessages}
          />
        }
        rightPanel={
          currentView === 'preview' ? (
            <PreviewPanel
              projectId={projectId}
              projectName={project.name}
              initialLoading={isNewProject}
            />
          ) : (
            <CodeExplorer
              projectId={projectId}
            />
          )
        }
        isChatCollapsed={isChatCollapsed}
      />
    </div>
  );
} 