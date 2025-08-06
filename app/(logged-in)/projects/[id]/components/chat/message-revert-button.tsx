'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RotateCcw, GitCommit } from 'lucide-react';
import { RevertConfirmationModal } from './revert-confirmation-modal';
import type { ChatMessage } from '@/lib/types/chat';

interface MessageRevertButtonProps {
  message: ChatMessage;
  projectId: number;
  chatSessionId: number;
  className?: string;
}

export function MessageRevertButton({
  message,
  projectId,
  chatSessionId,
  className,
}: MessageRevertButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Only show revert button for assistant messages with commit SHA
  if (message.role !== 'assistant' || !message.commitSha) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}
            onClick={() => setShowConfirmation(true)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <GitCommit className="h-3 w-3" />
            <span>Revert to this state ({message.commitSha?.slice(0, 7)})</span>
          </div>
        </TooltipContent>
      </Tooltip>

      <RevertConfirmationModal
        message={message}
        projectId={projectId}
        chatSessionId={chatSessionId}
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      />
    </TooltipProvider>
  );
}