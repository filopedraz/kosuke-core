'use client';

import { useEffect, useRef, useState } from 'react';

import { usePreviewStart, usePreviewStatus } from '@/hooks/use-preview';
import type { Project } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import BrandGuidelines from '../brand/brand-guidelines';
import ChatInterface from '../chat/chat-interface';
import CodeExplorer from '../preview/code-explorer';
import PreviewPanel from '../preview/preview-panel';

// Import types
import type { ChatMessageProps } from '@/lib/types';

interface ProjectContentProps {
  projectId: number;
  project: Project;
  initialMessages: ChatMessageProps[];
}

export default function ProjectContent({
  projectId,
  project,
  initialMessages,
}: ProjectContentProps) {

  // Local UI state management
  const [currentView, setCurrentView] = useState<'preview' | 'code' | 'branding'>('preview');
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Reference to the ChatInterface component to maintain its state
  const chatInterfaceRef = useRef<HTMLDivElement>(null);

  // Preview management hooks
  const { startPreview } = usePreviewStart(projectId);
  const { checkPreviewStatus } = usePreviewStatus(projectId);

  // Reset view/chat state when project changes
  useEffect(() => {
    setCurrentView('preview');
    setIsChatCollapsed(false);
  }, [project]);

  // Automatically check and start preview if not running
  useEffect(() => {
    const checkAndStartPreview = async () => {
      try {
        const status = await checkPreviewStatus();

        // If no preview URL is available, automatically start the preview
        if (!status?.previewUrl && !status?.url) {
          console.log(`[ProjectContent] No preview URL found, starting preview for project ${projectId}`);
          // Start preview silently (no success toast for automatic attempts)
          await startPreview();
        } else {
          console.log(`[ProjectContent] Preview already running for project ${projectId}:`, status.previewUrl || status.url);
        }
      } catch (error) {
        console.error(`[ProjectContent] Error checking/starting preview for project ${projectId}:`, error);
        // Don't show error toast for automatic attempts - user didn't manually trigger this
      }
    };

    checkAndStartPreview();
  }, [projectId]); // Only depend on projectId - functions are stable with useCallback

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
