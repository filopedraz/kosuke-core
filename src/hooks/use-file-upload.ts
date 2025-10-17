import type { AttachedImage } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';

// Hook for managing file upload and drag & drop functionality
export function useFileUpload() {
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle image attachment
  const handleImageAttach = (file: File) => {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Image is too large. Maximum size is 5MB.');
      return;
    }

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
  };

  // Handle file input change
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
              handleImageAttach(file);
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
  }, []);

  // Add drag and drop support for images
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
        if (file.type.startsWith('image/')) {
          handleImageAttach(file);
          console.log('Image dropped into chat input');
        }
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
  }, []);

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
