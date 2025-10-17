'use client';

import { Archive, ChevronDown, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ChatSession } from '@/lib/types';
import { ChatSessionItem } from './chat-session-item';

interface ChatArchivedSectionProps {
  archivedSessions: ChatSession[];
  showArchived: boolean;
  setShowArchived: (open: boolean) => void;
  activeChatSessionId: number | null;
  onChatSessionChange: (sessionId: number) => void;
  onRename: (session: ChatSession) => void;
  onDuplicate: (session: ChatSession) => void | Promise<void>;
  onViewBranch: (session: ChatSession) => void;
  onUnarchive: (session: ChatSession) => void | Promise<void>;
  onDelete: (session: ChatSession) => void | Promise<void>;
  formatRelativeTime: (dateString: string) => string;
}

export function ChatArchivedSection({
  archivedSessions,
  showArchived,
  setShowArchived,
  activeChatSessionId,
  onChatSessionChange,
  onRename,
  onDuplicate,
  onViewBranch,
  onUnarchive,
  onDelete,
  formatRelativeTime,
}: ChatArchivedSectionProps) {
  if (archivedSessions.length === 0) return null;

  return (
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
          <ChatSessionItem
            key={session.id}
            session={session}
            isActive={activeChatSessionId === session.id}
            variant="archived"
            onClick={() => onChatSessionChange(session.id)}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onViewBranch={onViewBranch}
            onToggleArchive={() => onUnarchive(session)}
            onDelete={onDelete}
            formatRelativeTime={formatRelativeTime}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}


