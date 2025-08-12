'use client';

import { Plus } from 'lucide-react';

import { useChatSidebar } from '@/hooks/use-chat-sidebar';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { cn } from '@/lib/utils';
import { ChatArchivedSection } from './chat-archived-section';
import { ChatSessionItem } from './chat-session-item';
import { NewChatDialog } from './new-chat-dialog';
import { RenameSessionDialog } from './rename-session-dialog';

interface ChatSidebarProps {
  projectId: number;
  activeChatSessionId: number | null;
  onChatSessionChange: (sessionId: number) => void;
  className?: string;
}

export default function ChatSidebar({
  projectId,
  activeChatSessionId,
  onChatSessionChange,
  className,
}: ChatSidebarProps) {
  const {
    // State
    activeSessions,
    archivedSessions,
    isNewChatModalOpen,
    editingSession,
    newChatTitle,
    showArchived,

    // Actions
    setIsNewChatModalOpen,
    setEditingSession,
    setNewChatTitle,
    setShowArchived,
    handleCreateChat,
    handleUpdateSession,
    handleDeleteSession,
    handleDuplicateSession,
    handleViewGitHubBranch,

    // Utilities
    formatRelativeTime,

    // Loading states
    isCreating,
  } = useChatSidebar({
    projectId,
    activeChatSessionId,
    onChatSessionChange,
  });

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Project Header */}
      <div className="p-4">
        <Button
          onClick={() => setIsNewChatModalOpen(true)}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* Active Sessions */}
          {activeSessions.map((session) => (
            <ChatSessionItem
              key={session.id}
              session={session}
              isActive={activeChatSessionId === session.id}
              variant="active"
              onClick={() => onChatSessionChange(session.id)}
              onRename={setEditingSession}
              onDuplicate={handleDuplicateSession}
              onViewBranch={handleViewGitHubBranch}
              onToggleArchive={(s) =>
                handleUpdateSession(s, {
                  status: s.status === 'archived' ? 'active' : 'archived',
                })
              }
              onDelete={handleDeleteSession}
              formatRelativeTime={formatRelativeTime}
            />
          ))}

          <ChatArchivedSection
            archivedSessions={archivedSessions}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            activeChatSessionId={activeChatSessionId}
            onChatSessionChange={onChatSessionChange}
            onRename={setEditingSession}
            onDuplicate={handleDuplicateSession}
            onViewBranch={handleViewGitHubBranch}
            onUnarchive={(s) => handleUpdateSession(s, { status: 'active' })}
            onDelete={handleDeleteSession}
            formatRelativeTime={formatRelativeTime}
          />
        </div>
      </ScrollArea>

      <NewChatDialog
        open={isNewChatModalOpen}
        onOpenChange={setIsNewChatModalOpen}
        title={newChatTitle}
        setTitle={setNewChatTitle}
        isCreating={isCreating}
        onCreate={handleCreateChat}
      />

      <RenameSessionDialog
        session={editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
        onRename={(session, title) => handleUpdateSession(session, { title })}
      />
    </div>
  );
}
