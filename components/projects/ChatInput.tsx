'use client';

import { ArrowUp, Loader2, Paperclip, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string, options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File }) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

interface AttachedImage {
  file: File;
  previewUrl: string;
}

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Type a message...',
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [includeContext, setIncludeContext] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [message]);

  // Handle clipboard paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              handleImageAttach(file);
              e.preventDefault();
              break;
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && !attachedImage) || isLoading) return;
    
    try {
      // Send the message with the attached image if present
      await onSendMessage(
        message.trim(), 
        { 
          includeContext,
          imageFile: attachedImage?.file 
        }
      );
      
      // Clear the input and attached image
      setMessage('');
      setAttachedImage(null);
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

  const handleImageAttach = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAttachedImage({
          file,
          previewUrl: e.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageAttach(file);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('px-4 pb-0', className)}>
      <div className="relative flex flex-col rounded-lg border border-border">
        {attachedImage && (
          <div className="ml-3 mr-3 mt-2 p-1.5 flex items-center gap-2 bg-muted/50 rounded-md border border-border/30">
            <div className="relative w-8 h-8 border border-border/50 rounded bg-background flex items-center justify-center overflow-hidden">
              <Image 
                src={attachedImage.previewUrl} 
                alt="Attached" 
                className="object-cover"
                fill
                sizes="32px"
              />
            </div>
            <div className="flex-1 text-xs text-muted-foreground truncate">
              <p className="truncate font-medium text-xs">{attachedImage.file.name}</p>
              <p className="text-[10px] text-muted-foreground/80">{(attachedImage.file.size / 1024).toFixed(1)}kB</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-auto"
              onClick={handleRemoveImage}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove image</span>
            </Button>
          </div>
        )}
        
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="min-h-[100px] max-h-[200px] resize-none border-0 !bg-transparent px-3 py-3 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm chat-input-textarea"
          rows={3}
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
        />
        
        <div className="flex items-center gap-2 px-3 absolute bottom-3 right-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="image-upload"
          />
          
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
            >
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach image</span>
            </Button>
          
            <Button 
              type="submit" 
              size="icon"
              variant={!message.trim() && !attachedImage ? "outline" : "default"}
              className="h-8 w-8"
              disabled={(!message.trim() && !attachedImage) || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
} 