'use client';

import Image from 'next/image';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ChatInputAttachmentsProps } from '@/lib/types';

export default function ChatInputAttachments({
  attachments,
  onRemoveAttachment,
}: ChatInputAttachmentsProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="ml-3 mr-3 mt-2 flex flex-wrap gap-2">
      {attachments.map((attachment, index) => {
        const isPDF = attachment.file.type === 'application/pdf';

        return (
          <div
            key={`${attachment.file.name}-${attachment.file.size}-${index}`}
            className="p-1.5 flex items-center gap-2 bg-muted/50 rounded-md border border-border/30 max-w-[200px]"
          >
            <div className="relative w-8 h-8 border border-border/50 rounded bg-background flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src={isPDF ? '/pdf-icon.svg' : attachment.previewUrl}
                alt={isPDF ? 'PDF attachment' : attachment.file.name}
                className={isPDF ? 'object-contain p-0.5' : 'object-cover'}
                fill
                sizes="32px"
              />
            </div>
            <div className="flex-1 text-xs text-muted-foreground truncate min-w-0">
              <p className="truncate font-medium text-xs">{attachment.file.name}</p>
              <p className="text-[10px] text-muted-foreground/80">
                {(attachment.file.size / 1024).toFixed(1)}kB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-auto shrink-0"
              onClick={() => onRemoveAttachment(index)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove attachment</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}


