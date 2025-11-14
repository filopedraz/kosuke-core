'use client';

import { ArrowUp, Image as ImageIcon, Loader2, Paperclip, Square, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Import types and hooks
import { ACCEPTED_FILE_TYPES_ACCEPT, useFileUpload } from '@/hooks/use-file-upload';
import type { ChatInputProps } from '@/lib/types';

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  isStreaming = false,
  onStop,
  placeholder = 'Type a message...',
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [includeContext, setIncludeContext] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use the file upload hook for all file-related logic
  const {
    attachments,
    isDraggingOver,
    fileInputRef,
    formRef,
    handleFileChange,
    handleRemoveAttachment,
    triggerFileInput,
    clearAttachments,
    hasAttachments,
  } = useFileUpload();

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Only reset height if we're actually changing content
    textarea.style.height = 'auto';

    // Calculate new height based on content
    const newHeight = `${Math.min(textarea.scrollHeight, 200)}px`;

    // Apply the new height
    textarea.style.height = newHeight;
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If streaming, stop the stream instead of sending
    if (isStreaming && onStop) {
      onStop();
      return;
    }

    if ((!message.trim() && !hasAttachments) || isLoading) return;

    try {
      // Send the message with all attached files if present
      await onSendMessage(
        message.trim(),
        {
          includeContext,
          attachments: attachments.map(a => a.file)
        }
      );

      // Clear the input and all attachments
      setMessage('');
      clearAttachments();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn('pb-0', className)}
    >
      <div
        className={cn(
          "relative flex flex-col rounded-lg border border-border transition-colors shadow-lg bg-background",
          isDraggingOver && "border-primary border-dashed bg-primary/5"
        )}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 pointer-events-none rounded-lg">
            <div className="flex flex-col items-center text-primary">
              <ImageIcon className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Drop images or PDFs to attach</p>
            </div>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="ml-3 mr-3 mt-2 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => {
              const isPDF = attachment.file.type === 'application/pdf';

              return (
              <div key={index} className="p-1.5 flex items-center gap-2 bg-muted/50 rounded-md border border-border/30 max-w-[200px]">
                <div className="relative w-8 h-8 border border-border/50 rounded bg-background flex items-center justify-center overflow-hidden shrink-0">
                  <Image
                    src={isPDF ? '/pdf-icon.svg' : attachment.previewUrl}
                    alt="Attached"
                    className={isPDF ? "object-contain p-0.5" : "object-cover"}
                    fill
                    sizes="32px"
                  />
                </div>
                <div className="flex-1 text-xs text-muted-foreground truncate min-w-0">
                  <p className="truncate font-medium text-xs">{attachment.file.name}</p>
                  <p className="text-[10px] text-muted-foreground/80">{(attachment.file.size / 1024).toFixed(1)}kB</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-auto shrink-0"
                  onClick={() => handleRemoveAttachment(index)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove attachment</span>
                </Button>
              </div>
            )})}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="min-h-[100px] max-h-[200px] resize-none border-0 !bg-transparent px-3 py-3 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          rows={3}
          style={{ height: '100px' }}  // Set initial fixed height
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
        />

        <div className="flex items-center gap-2 px-3 absolute bottom-3 right-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={ACCEPTED_FILE_TYPES_ACCEPT}
            multiple
            className="hidden"
            id="file-upload"
          />

          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLoading}
              onClick={triggerFileInput}
              title="Attach images or PDFs (you can also paste or drag & drop)"
            >
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach images or PDFs</span>
            </Button>

            <Button
              type="submit"
              size="icon"
              variant={isStreaming ? "outline" : (!message.trim() && !hasAttachments ? "outline" : "default")}
              className="h-8 w-8"
              disabled={!isStreaming && ((!message.trim() && !hasAttachments) || isLoading)}
            >
              {isLoading && !isStreaming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isStreaming ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
              <span className="sr-only">
                {isStreaming ? 'Stop generation' : 'Send message'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
