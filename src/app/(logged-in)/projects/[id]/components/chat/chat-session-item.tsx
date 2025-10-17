'use client';

import {
    Archive,
    Clock,
    Copy,
    Edit,
    ExternalLink,
    GitBranch,
    GitMerge,
    MoreVertical,
    Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatSessionItemProps {
  session: ChatSession;
  isActive: boolean;
  variant: 'active' | 'archived';
  onClick: () => void;
  onRename: (session: ChatSession) => void;
  onDuplicate: (session: ChatSession) => void | Promise<void>;
  onViewBranch: (session: ChatSession) => void;
  onToggleArchive: (session: ChatSession) => void | Promise<void>;
  onDelete: (session: ChatSession) => void | Promise<void>;
  formatRelativeTime: (dateString: string) => string;
}

export function ChatSessionItem({
  session,
  isActive,
  variant,
  onClick,
  onRename,
  onDuplicate,
  onViewBranch,
  onToggleArchive,
  onDelete,
  formatRelativeTime,
}: ChatSessionItemProps) {
  const containerClass =
    variant === 'active'
      ? cn(
          'group relative rounded-lg border p-3 cursor-pointer transition-colors',
          'hover:bg-accent/50',
          isActive ? 'bg-accent border-accent-foreground/20' : 'bg-background'
        )
      : cn(
          'group relative rounded-lg border p-3 cursor-pointer transition-colors opacity-75',
          'hover:bg-accent/50 hover:opacity-100',
          isActive ? 'bg-accent border-accent-foreground/20 opacity-100' : 'bg-background'
        );

  const archiveLabel = session.status === 'archived' ? 'Unarchive' : 'Archive';

  return (
    <div className={containerClass} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {variant === 'archived' && (
              <Archive className="h-4 w-4 text-muted-foreground" />
            )}
            <h3
              className={cn(
                'text-sm font-medium truncate',
                isActive && 'font-semibold'
              )}
            >
              {session.title}
            </h3>
            {variant === 'archived' && session.isDefault && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Main
              </Badge>
            )}
            {session.branchMergedAt && (
              variant === 'active' ? (
                <Badge className="text-xs px-2 py-0">
                  <GitMerge className="h-3 w-3 mr-1" />
                  merged
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  <GitMerge className="h-3 w-3 mr-1" />
                  Merged
                </Badge>
              )
            )}
            {variant === 'archived' && (
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

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <GitBranch className="h-3 w-3" />
            <span className="truncate">{session.sessionId}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(session)}>
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(session)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewBranch(session)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Branch
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggleArchive(session)}>
              <Archive className="h-4 w-4 mr-2" />
              {archiveLabel}
            </DropdownMenuItem>
            {!session.isDefault && (
              <DropdownMenuItem
                onClick={() => onDelete(session)}
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
  );
}


