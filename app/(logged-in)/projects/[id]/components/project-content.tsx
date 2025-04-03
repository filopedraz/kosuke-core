'use client';

import { useState, useEffect } from 'react';

import ChatInterface from './chat-interface';
import CodeExplorer from './code-explorer';
import PreviewPanel from './preview-panel';
import ProjectLayout from './project-layout';
import Navbar from '@/components/ui/navbar';
import { useProjectStore, type Project } from '@/lib/stores/projectStore';

interface ChatMessage {
  id: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

interface ProjectContentProps {
  projectId: number;
  project: Project;
  user: {
    id: number;
    name?: string;
    email: string;
    imageUrl?: string;
  };
  isNewProject?: boolean;
}

export default function ProjectContent({
  projectId,
  project,
  user,
  isNewProject = false,
}: ProjectContentProps) {
  const [currentView, setCurrentView] = useState<'preview' | 'code'>('preview');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const { setCurrentProject } = useProjectStore();
  
  // Set the current project in the store when the component mounts or project changes
  useEffect(() => {
    setCurrentProject(project);
  }, [project, setCurrentProject]);
  
  // Fetch chat history when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const fetchChatHistory = async () => {
      try {
        if (!isMounted) return;
        setIsLoadingMessages(true);
        
        const response = await fetch(`/api/projects/${projectId}/chat`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch chat history: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!isMounted) return;
        
        if (data.messages && Array.isArray(data.messages)) {
          setInitialMessages(data.messages.map((msg: Partial<ChatMessage>) => ({
            id: typeof msg.id === 'string' ? parseInt(msg.id, 10) : (msg.id || 0),
            content: msg.content || '',
            role: msg.role || 'user',
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          })));
        }
      } catch (error) {
        console.error('Error fetching initial chat history:', error);
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    };

    fetchChatHistory();
    
    return () => {
      isMounted = false;
    };
  }, [projectId]);
  
  const handleViewChange = (view: 'preview' | 'code') => {
    setCurrentView(view);
  };
  
  const handleRefresh = () => {
    console.log('Refresh functionality not implemented');
  };
  
  const handleToggleChat = () => {
    setIsChatCollapsed(!isChatCollapsed);
  };

  return (
    <div className="flex flex-col h-screen w-full">
      <Navbar 
        user={user}
        variant="project"
        projectProps={{
          projectName: project.name,
          currentView: currentView,
          onViewChange: handleViewChange,
          onRefresh: handleRefresh,
          isChatCollapsed: isChatCollapsed,
          onToggleChat: handleToggleChat,
        }}
      />
      <div className="flex-1 overflow-hidden">
        <ProjectLayout
          leftPanel={
            <ChatInterface 
              projectId={projectId}
              initialMessages={initialMessages}
              isLoading={isLoadingMessages}
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
    </div>
  );
} 