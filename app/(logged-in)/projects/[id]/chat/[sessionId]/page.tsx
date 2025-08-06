'use client';

import { notFound, useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import Navbar from '@/components/ui/navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatSessionMessages } from '@/hooks/use-chat-sessions';
import { useChatSessions } from '@/hooks/use-chat-sessions';
import { usePreviewStatus, useStartPreview } from '@/hooks/use-preview-status';
import { useProjectUIState } from '@/hooks/use-project-ui-state';
import { useProject } from '@/hooks/use-projects';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

// Import components
import BrandGuidelines from '../../components/brand/brand-guidelines';
import ChatInterface from '../../components/chat/chat-interface';
import ChatSidebar from '../../components/chat/chat-sidebar';
import CodeExplorer from '../../components/preview/code-explorer';
import PreviewPanel from '../../components/preview/preview-panel';
import DefaultBranchSettings from '../../components/settings/default-branch-settings';

interface SessionChatPageProps {
  params: Promise<{
    id: string;
    sessionId: string;
  }>;
}

function SessionChatLoadingSkeleton() {
  return (
    <div className="flex flex-col h-screen w-full">
      {/* Navbar Skeleton */}
      <div className="w-full">
        <header className="w-full h-14 flex items-center bg-background">
          <div className="flex w-full h-full">
            {/* Left section - matches chat width */}
            <div className="flex items-center h-full w-full md:w-1/3 lg:w-1/3 border-r border-transparent relative">
              <div className="px-4 flex items-center">
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>

            {/* Right section - project title and controls */}
            <div className="flex-1 flex items-center justify-between">
              <Skeleton className="h-5 w-32 ml-4" />
              <div className="flex items-center gap-2 mx-auto">
                <div className="flex border border-input rounded-md overflow-hidden">
                  <Skeleton className="h-8 w-20 rounded-none" />
                  <Skeleton className="h-8 w-16 rounded-none" />
                  <Skeleton className="h-8 w-20 rounded-none" />
                  <Skeleton className="h-8 w-20 rounded-none" />
                </div>
              </div>
              <div className="flex items-center gap-2 px-4">
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Content Skeleton */}
      <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        {/* Left Panel - Chat Area with Sidebar & Interface */}
        <div className="w-full md:w-1/3 lg:w-1/3 h-full flex">
          {/* Chat Sidebar */}
          <div className="w-1/2 border-r">
            <div className="p-4">
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="flex-1 p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
          {/* Chat Interface */}
          <div className="w-1/2">
            <div className="p-4 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>

        {/* Right Panel - Preview/Code Explorer */}
        <div className="hidden md:flex md:w-2/3 lg:w-2/3 h-full flex-col overflow-hidden border border-border rounded-md">
          <div className="flex items-center justify-between p-4 border-b">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-2 w-64 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionChatPage({ params }: SessionChatPageProps) {
  // Unwrap promises using React.use()
  const { id, sessionId } = use(params);
  const router = useRouter();

  const projectId = Number(id);

  if (isNaN(projectId)) {
    notFound();
  }

  const { user } = useUser();
  const { data: project, isLoading: isProjectLoading, error: projectError } = useProject(projectId);
  const { data: sessions = [], isLoading: isSessionsLoading } = useChatSessions(projectId);
  const { data: messagesData, isLoading: isMessagesLoading } = useChatSessionMessages(projectId, sessionId);

  // UI state management
  const { currentView, setCurrentView, isChatCollapsed, toggleChatCollapsed } = useProjectUIState(project);

  // Find the current session
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [activeChatSessionId, setActiveChatSessionId] = useState<number | null>(null);

  // Find current session by sessionId
  useEffect(() => {
    if (sessions.length > 0) {
      const session = sessions.find(s => s.sessionId === sessionId);
      if (session) {
        setCurrentSession(session);
        setActiveChatSessionId(session.id);
      } else {
        // Session not found, redirect to project page
        notFound();
      }
    }
  }, [sessions, sessionId, router, projectId]);

  // Get current session branch information
  const currentBranch = currentSession?.githubBranchName;

  // Preview management hooks - always use current session
  const { data: previewStatus, isLoading: isPreviewLoading } = usePreviewStatus(
    projectId,
    sessionId,
    false
  );
  const { mutateAsync: startPreview } = useStartPreview(projectId, sessionId);

  // Automatically start preview if not running
  useEffect(() => {
    if (!isPreviewLoading && previewStatus && !previewStatus.url && currentSession) {
      console.log(`[SessionChatPage] Starting preview for session ${sessionId}`);
      startPreview().catch((error) => {
        console.error(`[SessionChatPage] Error starting preview for session ${sessionId}:`, error);
      });
    }
  }, [previewStatus, isPreviewLoading, startPreview, sessionId, currentSession]);

  // Loading state
  if (isProjectLoading || isSessionsLoading || isMessagesLoading || !user || !currentSession) {
    return <SessionChatLoadingSkeleton />;
  }

  // Error handling
  if (projectError || !project) {
    notFound();
  }

  // Access control - check project ownership
  if (project.createdBy !== user.id) {
    console.error('Access denied: User does not own this project');
    notFound();
  }

  // Handlers
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleChatSessionChange = (newSessionId: number) => {
    const newSession = sessions.find(s => s.id === newSessionId);
    if (newSession) {
      router.push(`/projects/${projectId}/chat/${newSession.sessionId}`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full">
      <Navbar
        variant="project"
        projectProps={{
          projectName: project?.name || 'Loading Project...',
          currentView: currentView,
          onViewChange: setCurrentView,
          onRefresh: handleRefresh,
          isChatCollapsed: isChatCollapsed,
          onToggleChat: toggleChatCollapsed,
          showSidebar: true, // Always show sidebar in session view
          onToggleSidebar: () => {}, // No toggle in session view
        }}
      />
      
      <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        {/* Left Panel - Chat Area (Sidebar + Interface) */}
        <div
          className={cn(
            "h-full overflow-hidden flex",
            // Wider chat area to accommodate both sidebar and interface
            isChatCollapsed ? "w-0 opacity-0" : "w-full sm:w-1/3 md:w-1/3 lg:w-1/3"
          )}
          style={{
            visibility: isChatCollapsed ? 'hidden' : 'visible',
            display: isChatCollapsed ? 'none' : 'flex'
          }}
        >
          {/* Chat Sidebar - Half width */}
          <div className="w-1/2 border-r border-border">
            <ChatSidebar
              projectId={projectId}
              activeChatSessionId={activeChatSessionId}
              onChatSessionChange={handleChatSessionChange}
            />
          </div>

          {/* Chat Interface - Half width */}
          <div className="w-1/2 flex flex-col">
            <ChatInterface
              projectId={projectId}
              initialMessages={messagesData?.messages || []}
              isLoading={isMessagesLoading}
              activeChatSessionId={activeChatSessionId}
              currentBranch={currentBranch}
              sessionId={sessionId}
            />
          </div>
        </div>

        {/* Right Panel - Preview/Code Explorer */}
        <div
          className={cn(
            "h-full flex-col overflow-hidden border rounded-md border-border",
            // Adjusted width for preview panel
            isChatCollapsed ? "w-full" : "hidden md:flex sm:w-2/3 md:w-2/3 lg:w-2/3"
          )}
        >
          {currentView === 'preview' ? (
            <PreviewPanel
              projectId={projectId}
              projectName={project.name}
              sessionId={sessionId}
            />
          ) : currentView === 'code' ? (
            <CodeExplorer
              projectId={projectId}
            />
          ) : currentView === 'branding' ? (
            <BrandGuidelines
              projectId={projectId}
            />
          ) : currentView === 'settings' ? (
            <DefaultBranchSettings
              projectId={projectId}
            />
          ) : (
            <BrandGuidelines
              projectId={projectId}
            />
          )}
        </div>
      </div>
    </div>
  );
}