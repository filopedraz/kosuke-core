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
  MessageCircle,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { useChatSessions, useCreateChatSession, useDeleteChatSession, useUpdateChatSession } from '@/hooks/use-chat-sessions';
import type { ChatSession } from '@/lib/types';

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
  DialogFooter,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  projectId: number;
  projectName: string;
  activeChatSessionId: number | null;
  onChatSessionChange: (sessionId: number) => void;
  className?: string;
}

export default function ChatSidebar({
  projectId,
  projectName,
  activeChatSessionId,
  onChatSessionChange,
  className,
}: ChatSidebarProps) {
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ChatSession | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Hooks
  const { data: sessions = [], isLoading } = useChatSessions(projectId);
  const createChatSession = useCreateChatSession(projectId);
  const updateChatSession = useUpdateChatSession(projectId);
  const deleteChatSession = useDeleteChatSession(projectId);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  // Handle new chat creation
  const handleCreateChat = async () => {
    if (!newChatTitle.trim()) return;

    await createChatSession.mutateAsync({
      title: newChatTitle.trim(),
      description: newChatDescription.trim() || undefined,
    });

    // Reset form and close modal
    setNewChatTitle('');
    setNewChatDescription('');
    setIsNewChatModalOpen(false);
  };

  // Handle session update
  const handleUpdateSession = async (session: ChatSession, updates: Partial<ChatSession>) => {
    await updateChatSession.mutateAsync({
      sessionId: session.sessionId,
      data: updates,
    });
    setEditingSession(null);
  };

  // Handle session deletion
  const handleDeleteSession = async (session: ChatSession) => {
    if (session.isDefault) return; // Prevent deletion of default session

    const confirmed = window.confirm(
      `Are you sure you want to delete "${session.title}"? This action cannot be undone.`
    );

    if (confirmed) {
      await deleteChatSession.mutateAsync(session.sessionId);
    }
  };

  // Handle session duplication
  const handleDuplicateSession = async (session: ChatSession) => {
    await createChatSession.mutateAsync({
      title: `${session.title} (Copy)`,
      description: session.description,
    });
  };

  // Handle view GitHub branch
  const handleViewGitHubBranch = (session: ChatSession) => {
    if (session.githubBranchName) {
      // This would need to be implemented with actual GitHub URL
      const githubUrl = `https://github.com/owner/repo/tree/${session.githubBranchName}`;
      window.open(githubUrl, '_blank');
    }
  };

  // Separate sessions by status
  const activeSessions = sessions.filter(s => s.status === 'active');
  const archivedSessions = sessions.filter(s => s.status === 'archived');

  if (isLoading) {
    return (
      <div className={cn('w-full h-full', className)}>
        <div className="p-4 border-b">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Project Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 bg-primary rounded flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-foreground">
              {projectName.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="font-semibold text-sm truncate">{projectName}</h2>
        </div>
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
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Chat Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="Enter chat session title"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newChatDescription}
                onChange={(e) => setNewChatDescription(e.target.value)}
                placeholder="Brief description of this chat session"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewChatModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChat}
              disabled={!newChatTitle.trim() || createChatSession.isPending}
            >
              {createChatSession.isPending ? 'Creating...' : 'Create Chat'}
            </Button>
          </DialogFooter>
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
