import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AsyncOperationOptions } from '@/lib/api';

interface PreviewStatus {
  url?: string;
  previewUrl?: string;
  status?: string;
}

export function usePreviewStart(projectId: number) {
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);

  const startPreview = useCallback(async (options?: AsyncOperationOptions) => {
    setIsStarting(true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/preview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start preview');
      }

      const result = await response.json();
      
      // Only show success toast if options are provided (explicit user action)
      if (options?.successMessage || options?.onSuccess) {
        toast({
          title: 'Success',
          description: options.successMessage || 'Preview is starting...',
        });
      }
      
      options?.onSuccess?.();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start preview';
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: options?.errorMessage || errorMessage,
      });
      
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    } finally {
      setIsStarting(false);
    }
  }, [projectId, toast]);

  return {
    startPreview,
    isStarting,
  };
}

export function usePreviewStatus(projectId: number) {
  const [isChecking, setIsChecking] = useState(false);

  const checkPreviewStatus = useCallback(async (): Promise<PreviewStatus | null> => {
    setIsChecking(true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/preview`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking preview status:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [projectId]);

  return {
    checkPreviewStatus,
    isChecking,
  };
}