'use client';

import Image from 'next/image';

import type { Attachment, ChatMessageAttachmentsProps } from '@/lib/types';

export default function ChatMessageAttachments({
  attachments,
}: ChatMessageAttachmentsProps) {
  if (attachments.length === 0) {
    return null;
  }

  const handleAttachmentOpen = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {attachments.map((attachment: Attachment) => {
        const isImage = attachment.fileType === 'image';
        const isPDF = attachment.fileType === 'document';

        return (
          <div
            key={attachment.id}
            className="flex items-center gap-3 bg-card rounded-md p-2 px-3 border border-border max-w-[300px]"
          >
            <div className="relative w-12 h-12 rounded-sm bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {isImage ? (
                <div
                  className="relative w-full h-full cursor-pointer"
                  onClick={() => handleAttachmentOpen(attachment.fileUrl)}
                >
                  <Image
                    src={attachment.fileUrl}
                    alt={attachment.filename}
                    fill
                    className="object-cover"
                    sizes="(max-width: 48px) 100vw, 48px"
                  />
                </div>
              ) : isPDF ? (
                <div
                  className="relative w-full h-full cursor-pointer flex items-center justify-center"
                  onClick={() => handleAttachmentOpen(attachment.fileUrl)}
                >
                  <Image
                    src="/pdf-icon.svg"
                    alt="PDF Document"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
              ) : null}
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <p className="text-card-foreground text-sm font-medium truncate">{attachment.filename}</p>
              <p className="text-xs text-muted-foreground">
                {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)}kB` : 'Unknown size'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}


