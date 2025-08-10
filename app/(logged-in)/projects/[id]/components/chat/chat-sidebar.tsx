'use client';

import {
  Archive,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Edit,
  ExternalLink,
  GitBranch,
  GitMerge,
  MessageCircle,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';

import { useChatSidebar } from '@/hooks/use-chat-sidebar';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

import { cn } from '@/lib/utils';

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
            <div
              key={session.id}
              className={cn(
                'group relative rounded-lg border p-3 cursor-pointer transition-colors',
                'hover:bg-accent/50',
                activeChatSessionId === session.id
                  ? 'bg-accent border-accent-foreground/20'
                  : 'bg-background'
              )}
              onClick={() => onChatSessionChange(session.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      'text-sm font-medium truncate',
                      activeChatSessionId === session.id && 'font-semibold'
                    )}>
                      {session.title}
                    </h3>
                    {session.branchMergedAt && (
                      <Badge className="text-xs px-2 py-0">
                        <GitMerge className="h-3 w-3 mr-1" />
                        merged
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(session.lastActivityAt)}</span>
                    {session.messageCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{session.messageCount} messages</span>
                      </>
                    )}
                  </div>

                  {/* GitHub Branch Name */}
                  {session.githubBranchName && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <GitBranch className="h-3 w-3" />
                      <span className="truncate">{session.githubBranchName}</span>
                    </div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingSession(session)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicateSession(session)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {session.githubBranchName && (
                      <DropdownMenuItem onClick={() => handleViewGitHubBranch(session)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Branch
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleUpdateSession(session, {
                        status: session.status === 'archived' ? 'active' : 'archived'
                      })}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {session.status === 'archived' ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                    {!session.isDefault && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteSession(session)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {/* Archived Sessions */}
          {archivedSessions.length > 0 && (
            <Collapsible open={showArchived} onOpenChange={setShowArchived}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
                  size="sm"
                >
                  {showArchived ? (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronRight className="h-3 w-3 mr-1" />
                  )}
                  <Archive className="h-3 w-3 mr-1" />
                  Archived ({archivedSessions.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {archivedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'group relative rounded-lg border p-3 cursor-pointer transition-colors opacity-75',
                      'hover:bg-accent/50 hover:opacity-100',
                      activeChatSessionId === session.id
                        ? 'bg-accent border-accent-foreground/20 opacity-100'
                        : 'bg-background'
                    )}
                    onClick={() => onChatSessionChange(session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Archive className="h-4 w-4 text-muted-foreground" />
                          <h3 className={cn(
                            'text-sm font-medium truncate',
                            activeChatSessionId === session.id && 'font-semibold'
                          )}>
                            {session.title}
                          </h3>
                          {session.isDefault && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              Main
                            </Badge>
                          )}
                          {session.branchMergedAt && (
                            <Badge variant="secondary" className="text-xs px-2 py-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <GitMerge className="h-3 w-3 mr-1" />
                              Merged
                            </Badge>
                          )}
                          {/* GitHub Branch Indicator */}
                          {session.githubBranchName && (
                            <GitBranch className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(session.lastActivityAt)}</span>
                          {session.messageCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{session.messageCount} messages</span>
                            </>
                          )}
                        </div>

                        {/* GitHub Branch Name */}
                        {session.githubBranchName && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <GitBranch className="h-3 w-3" />
                            <span className="truncate">{session.githubBranchName}</span>
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingSession(session)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateSession(session)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {session.githubBranchName && (
                            <DropdownMenuItem onClick={() => handleViewGitHubBranch(session)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Branch
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleUpdateSession(session, {
                              status: 'active'
                            })}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Unarchive
                          </DropdownMenuItem>
                          {!session.isDefault && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteSession(session)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      {/* New Chat Modal */}
      <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
        <DialogContent
          className="p-0 overflow-hidden border border-border bg-card shadow-lg rounded-md"
          style={{ maxWidth: '512px' }}
        >
          <DialogTitle className="sr-only">Create New Chat Session</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new chat session for this project
          </DialogDescription>

          <div className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">New Chat Session</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="title"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChatTitle.trim() && !isCreating) {
                      handleCreateChat();
                    }
                  }}
                  className="h-11"
                  placeholder="Enter chat session title"
                  maxLength={100}
                  disabled={isCreating}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center gap-3 pt-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsNewChatModalOpen(false)}
                  disabled={isCreating}
                  className="h-10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateChat}
                  disabled={!newChatTitle.trim() || isCreating}
                  className="h-10 min-w-[120px]"
                >
                  {isCreating ? 'Creating...' : 'Create Chat'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Session Modal */}
      <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat Session</DialogTitle>
          </DialogHeader>
          {editingSession && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  defaultValue={editingSession.title}
                  onBlur={(e) => {
                    if (e.target.value !== editingSession.title) {
                      handleUpdateSession(editingSession, { title: e.target.value });
                    }
                  }}
                  placeholder="Enter chat session title"
                  maxLength={100}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
