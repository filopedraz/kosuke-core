import type { AttachedImage } from '@/lib/types';
import { useCallback, useEffect, useRef, useState } from 'react';

// Accepted file types: images and PDFs
export const ACCEPTED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

// Generate accept attribute string for file input
export const ACCEPTED_FILE_TYPES_ACCEPT = 'image/*,application/pdf';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Hook for managing file upload and drag & drop functionality
export function useFileUpload() {
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Check if file type is accepted
  const isAcceptedFileType = useCallback((fileType: string): boolean => {
    return ACCEPTED_FILE_TYPES.includes(fileType);
  }, []);

  // Handle file attachment (images and PDFs)
  const handleFileAttach = useCallback(
    (file: File) => {
      // Check file type
      if (!isAcceptedFileType(file.type)) {
        alert('File type not supported. Please upload an image (JPEG, PNG, GIF, WebP) or PDF.');
        return;
      }

      // Check file size (max 10MB)
      if (file.size > MAX_FILE_SIZE) {
        alert('File is too large. Maximum size is 10MB.');
        return;
      }

      // For images, create a preview. For PDFs, use a placeholder
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
          if (e.target?.result) {
            setAttachedImage({
              file,
              previewUrl: e.target.result as string,
            });
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        // For PDFs, use a placeholder preview
        setAttachedImage({
          file,
          previewUrl: '/pdf-icon.svg', // We'll use a PDF icon placeholder
        });
      }
    },
    [isAcceptedFileType]
  );

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileAttach(file);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attached image
  const handleRemoveImage = () => {
    setAttachedImage(null);
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle clipboard paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              handleFileAttach(file);
              e.preventDefault();
              console.log('Image pasted from clipboard');
              break;
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFileAttach]);

  // Add drag and drop support for images and PDFs
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleFileAttach(file);
        console.log('File dropped into chat input');
      }
    };

    form.addEventListener('dragover', handleDragOver);
    form.addEventListener('dragleave', handleDragLeave);
    form.addEventListener('drop', handleDrop);

    return () => {
      form.removeEventListener('dragover', handleDragOver);
      form.removeEventListener('dragleave', handleDragLeave);
      form.removeEventListener('drop', handleDrop);
    };
  }, [handleFileAttach]);

  // Clear attachment (useful when message is sent)
  const clearAttachment = () => {
    setAttachedImage(null);
  };

  return {
    // State
    attachedImage,
    isDraggingOver,

    // Refs
    fileInputRef,
    formRef,

    // Handlers
    handleFileChange,
    handleRemoveImage,
    triggerFileInput,
    clearAttachment,

    // Utilities
    hasAttachment: !!attachedImage,
  };
}
