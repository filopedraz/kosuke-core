import type { AttachedImage } from '@/lib/types';
import { useCallback, useEffect, useRef, useState } from 'react';

// Accepted file types: images and PDFs
const ACCEPTED_FILE_TYPES = [
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
const MAX_FILES = 10; // Maximum number of files allowed

// Hook for managing file upload and drag & drop functionality (supports multiple files)
export function useFileUpload() {
  const [attachments, setAttachments] = useState<AttachedImage[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Check if file type is accepted
  const isAcceptedFileType = useCallback((fileType: string): boolean => {
    return ACCEPTED_FILE_TYPES.includes(fileType);
  }, []);

  // Handle file attachment (images and PDFs) - supports adding multiple files
  const handleFileAttach = useCallback(
    (file: File, skipLimitCheck = false) => {
      // Check max files limit (unless explicitly skipped for batch operations)
      if (!skipLimitCheck && attachments.length >= MAX_FILES) {
        alert(`Maximum ${MAX_FILES} files allowed. Please remove some files before adding more.`);
        return false;
      }

      // Check file type
      if (!isAcceptedFileType(file.type)) {
        alert('File type not supported. Please upload an image (JPEG, PNG, GIF, WebP) or PDF.');
        return false;
      }

      // Check file size (max 10MB)
      if (file.size > MAX_FILE_SIZE) {
        alert('File is too large. Maximum size is 10MB.');
        return false;
      }

      // For images, create a preview. For PDFs, use a placeholder
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
          const result = e.target?.result;
          if (result) {
            setAttachments(prev => [
              ...prev,
              {
                file,
                previewUrl: result as string,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        // For PDFs, use PDF icon from public directory
        setAttachments(prev => [
          ...prev,
          {
            file,
            previewUrl: '/pdf-icon.svg',
          },
        ]);
      }

      return true;
    },
    [isAcceptedFileType, attachments.length]
  );

  // Handle file input change - supports multiple file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      const remainingSlots = MAX_FILES - attachments.length;

      // Check if trying to add too many files
      if (filesArray.length > remainingSlots) {
        alert(
          `You can only add ${remainingSlots} more file(s). Maximum ${MAX_FILES} files allowed.`
        );
        // Add only the files that fit within the limit
        filesArray.slice(0, remainingSlots).forEach(file => {
          handleFileAttach(file, true);
        });
      } else {
        // Add all selected files
        filesArray.forEach(file => {
          handleFileAttach(file, true);
        });
      }
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove specific attachment by index
  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

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

  // Add drag and drop support for images and PDFs - supports multiple files
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
        const filesArray = Array.from(e.dataTransfer.files);
        const remainingSlots = MAX_FILES - attachments.length;

        // Check if trying to add too many files
        if (filesArray.length > remainingSlots) {
          alert(
            `You can only add ${remainingSlots} more file(s). Maximum ${MAX_FILES} files allowed.`
          );
          // Add only the files that fit within the limit
          filesArray.slice(0, remainingSlots).forEach(file => {
            handleFileAttach(file, true);
          });
        } else {
          // Add all dropped files
          filesArray.forEach(file => {
            handleFileAttach(file, true);
          });
        }
        console.log(`${Math.min(filesArray.length, remainingSlots)} file(s) added via drag & drop`);
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
  }, [handleFileAttach, attachments.length]);

  // Clear all attachments (useful when message is sent)
  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    // State
    attachments,
    isDraggingOver,

    // Refs
    fileInputRef,
    formRef,

    // Handlers
    handleFileChange,
    handleRemoveAttachment,
    triggerFileInput,
    clearAttachments,

    // Utilities
    hasAttachments: attachments.length > 0,
  };
}
