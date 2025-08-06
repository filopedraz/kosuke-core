'use client';


import { notFound } from 'next/navigation';
import { use, useEffect, useRef, useState } from 'react';

import Navbar from '@/components/ui/navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { useChatSessions } from '@/hooks/use-chat-sessions';
import { usePreviewStatus, useStartPreview } from '@/hooks/use-preview-status';
import { useProjectUIState } from '@/hooks/use-project-ui-state';
import { useProject } from '@/hooks/use-projects';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

// Import components
import BrandGuidelines from './components/brand/brand-guidelines';
import ChatInterface from './components/chat/chat-interface';
import ChatSidebar from './components/chat/chat-sidebar';
import CodeExplorer from './components/preview/code-explorer';
import PreviewPanel from './components/preview/preview-panel';
import DefaultBranchSettings from './components/settings/default-branch-settings';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

function ProjectLoadingSkeleton() {
  return (
    <div className="flex flex-col h-screen w-full">
      {/* Navbar Skeleton */}
      <div className="w-full">
        <header className="w-full h-14 flex items-center bg-background">
          <div className="flex w-full h-full">
            {/* Left section - matches chat width */}
            <div className="flex items-center h-full w-full md:w-1/4 lg:w-1/4 border-r border-transparent relative">
              <div className="px-4 flex items-center">
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>

              {/* Sidebar/Chat toggle button skeleton */}
              <Skeleton className="h-8 w-8 rounded-md" />

              {/* Collapse toggle button skeleton */}
              <div className="absolute right-0 mr-2">
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
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
        {/* Left Panel Skeleton - Chat Sidebar */}
        <div className="h-full overflow-hidden w-full md:w-1/4 lg:w-1/4">
          <div className="relative flex h-full w-full rounded-md">
            <div className="flex flex-col h-full w-full">
              {/* New Chat Button Skeleton */}
              <div className="p-4">
                <Skeleton className="h-9 w-full rounded-md" />
              </div>

              {/* Chat Sessions List Skeleton */}
              <div className="flex-1 p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel Skeleton - Preview/Code Explorer */}
        <div className="hidden md:flex md:w-3/4 lg:w-3/4 h-full flex-col overflow-hidden border border-border rounded-md">
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

export default function ProjectPage({ params }: ProjectPageProps) {
  // Unwrap promises using React.use()
  const { id } = use(params);

  const projectId = Number(id);

  if (isNaN(projectId)) {
    notFound();
  }

  const { user } = useUser();
  const { data: project, isLoading: isProjectLoading, error: projectError } = useProject(projectId);
  const { data: messagesData, isLoading: isMessagesLoading } = useChatMessages(projectId, [], false);
  const { data: sessions = [] } = useChatSessions(projectId);

    // UI state management
  const { currentView, setCurrentView, isChatCollapsed, toggleChatCollapsed } = useProjectUIState(project);

  // Chat session state management
  const [activeChatSessionId, setActiveChatSessionId] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true); // Start with sidebar visible

  // Auto-select default session when sessions are loaded
  useEffect(() => {
    if (sessions.length > 0 && activeChatSessionId === null) {
      // Find default session or use the first session
      const defaultSession = sessions.find(session => session.isDefault) || sessions[0];
      if (defaultSession) {
        setActiveChatSessionId(defaultSession.id);
      }
    }
  }, [sessions, activeChatSessionId]);

  // Get current session branch information
  const currentSession = sessions.find(session => session.id === activeChatSessionId);
  const currentBranch = currentSession?.githubBranchName;
  const sessionId = currentSession?.sessionId;

  // Preview should use session only when in chat interface view, not in sidebar list view
  const previewSessionId = showSidebar ? null : (sessionId || null);

    // Preview management hooks - use null when in sidebar view (main branch)
  const { data: previewStatus, isLoading: isPreviewLoading } = usePreviewStatus(
    projectId,
    previewSessionId,
    false // Disable polling initially
  );
  const { mutateAsync: startPreview } = useStartPreview(projectId, previewSessionId);

  // Reference to the ChatInterface component to maintain its state
  const chatInterfaceRef = useRef<HTMLDivElement>(null);
  // Track if we've already attempted to start preview for this project
  const previewStartAttempted = useRef<Set<number>>(new Set());

  // Automatically start preview if not running (only once per project)
  useEffect(() => {
    if (!isPreviewLoading && previewStatus && !previewStatus.url) {
      if (!previewStartAttempted.current.has(projectId)) {
        previewStartAttempted.current.add(projectId);
        console.log(`[ProjectPage] No preview URL found, starting preview for project ${projectId}`);
        startPreview().catch((error) => {
          console.error(`[ProjectPage] Error starting preview for project ${projectId}:`, error);
        });
      }
    } else if (previewStatus?.url) {
      console.log(`[ProjectPage] Preview already running for project ${projectId}:`, previewStatus.url);
    }
  }, [projectId, previewStatus, isPreviewLoading, startPreview]);

  // Loading state
  if (isProjectLoading || isMessagesLoading || !user) {
    return <ProjectLoadingSkeleton />;
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
    // Refresh could trigger a page reload or refetch project data
    window.location.reload();
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
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
          showSidebar: showSidebar,
          onToggleSidebar: toggleSidebar,
        }}
      />
            <div className={cn('flex h-[calc(100vh-3.5rem)] w-full overflow-hidden')}>
        <div
          ref={chatInterfaceRef}
          className={cn(
            "h-full overflow-hidden",
            // Balanced width for chat area - more than original but not too much
            isChatCollapsed ? "w-0 opacity-0" : "w-full sm:w-1/4 md:w-1/4 lg:w-1/4"
          )}
          style={{
            // Use visibility instead of conditional rendering
            visibility: isChatCollapsed ? 'hidden' : 'visible',
            // Use display to properly hide when collapsed
            display: isChatCollapsed ? 'none' : 'flex'
          }}
        >
          {/* Chat area with toggle between sidebar and interface */}
          <div className="relative flex h-full w-full rounded-md">
            {showSidebar ? (
              /* Chat Sidebar - Full Width */
              <div className="w-full">
                <ChatSidebar
                  projectId={projectId}
                  activeChatSessionId={activeChatSessionId}
                  onChatSessionChange={(sessionId) => {
                    setActiveChatSessionId(sessionId);
                    setShowSidebar(false); // Switch to chat interface when selecting a session
                  }}
                />
              </div>
            ) : (
              /* Chat Interface - Full Width */
              <div className="w-full flex flex-col">
                <ChatInterface
                  projectId={projectId}
                  initialMessages={messagesData?.messages || []}
                  isLoading={isMessagesLoading}
                  activeChatSessionId={activeChatSessionId}
                  currentBranch={currentBranch}
                  sessionId={sessionId}
                />
              </div>
            )}


          </div>
        </div>

        <div
          className={cn(
            "h-full flex-col overflow-hidden border rounded-md border-border",
            // Balanced width for preview panel - maintains good visibility
            isChatCollapsed ? "w-full" : "hidden md:flex sm:w-3/4 md:w-3/4 lg:w-3/4"
          )}
        >
          {currentView === 'preview' ? (
            <PreviewPanel
              projectId={projectId}
              projectName={project.name}
              sessionId={previewSessionId}
              branch={currentBranch}
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
