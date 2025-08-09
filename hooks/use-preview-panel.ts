import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { PreviewStatus, UsePreviewPanelOptions, UsePreviewPanelReturn } from '@/lib/types';
import { useStartPreview } from './use-preview-status';

export function usePreviewPanel({
  projectId,
  sessionId,
  projectName,
}: UsePreviewPanelOptions): UsePreviewPanelReturn {
  const { toast } = useToast();

  // Initialize hooks - use null when no session is selected to fallback to main branch
  const { mutateAsync: startPreview, isPending: isStarting } = useStartPreview(
    projectId,
    sessionId
  );

  // State
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const requestInFlightRef = useRef(false);
  // Removed gitStatus from status flow; pull flow handles its own toasts

  // Check if the preview server is ready by requiring a 200 from server-side probe
  const checkServerHealth = useCallback(async (url: string): Promise<boolean> => {
    try {
      const healthUrl = `/api/preview/health?url=${encodeURIComponent(url)}&timeout=3000`;
      const response = await fetch(healthUrl, { method: 'GET' });
      if (!response.ok) return false;
      const data: { ok: boolean; status?: number } = await response.json();
      return Boolean(data.ok);
    } catch (error) {
      if (Math.random() < 0.2) {
        console.log(
          '[Preview Panel] Health check failed (sample):',
          error instanceof Error ? error.message : 'Connection failed'
        );
      }
      return false;
    }
  }, []);

  // Poll the server until it's ready
  const pollServerUntilReady = useCallback(
    async (url: string, maxAttempts = 60) => {
      console.log(
        '[Preview Panel] Starting health check polling (waiting for HTTP 200; will wait 5s before first attempt)'
      );
      let attempts = 0;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setError('Server failed to start after multiple attempts');
          setStatus('error');
          return;
        }

        attempts++;
        setProgress(Math.min(90, Math.floor((attempts / maxAttempts) * 100)));

        const isHealthy = await checkServerHealth(url);

        if (isHealthy) {
          console.log('[Preview Panel] Server is healthy');
          setStatus('ready');
          setProgress(100);
        } else {
          console.log(
            `[Preview Panel] Health check attempt ${attempts}/${maxAttempts} failed (non-200), retrying in 3s`
          );
          // Use longer delays for more patient polling
          const delay = attempts <= 3 ? 5000 : 3000; // 5s for first 3 attempts, then 3s
          setTimeout(poll, delay);
        }
      };

      // Wait 5 seconds before starting health checks to give container time to start
      setTimeout(poll, 5000);
    },
    [checkServerHealth]
  );

  // Ref to store fetchPreviewUrl function to avoid circular dependencies
  const fetchPreviewUrlRef = useRef<((forceStart?: boolean) => Promise<void>) | null>(null);

  // Fetch the preview URL
  const fetchPreviewUrl = useCallback(
    async (forceStart: boolean = false) => {
      // Prevent duplicate requests using a ref-based lock
      if (requestInFlightRef.current) {
        console.log(
          `[Preview Panel] Request already in progress for project ${projectId}, skipping`
        );
        return;
      }
      requestInFlightRef.current = true;
      setStatus('loading');
      setProgress(0);
      setError(null);
      // No git status in status/start flows

      try {
        // Use main branch API when no session is selected
        const sessionText = sessionId ? `session ${sessionId}` : 'main branch';
        console.log(
          `[Preview Panel] Fetching preview URL for project ${projectId} ${sessionText}${forceStart ? ' (forcing refresh)' : ''}`
        );

        // Use session-specific or main branch API
        const url = sessionId
          ? `/api/projects/${projectId}/chat-sessions/${sessionId}/preview`
          : `/api/projects/${projectId}/preview`;

        const response = await fetch(url, {
          method: 'GET',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to fetch preview: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[Preview Panel] Preview status response:`, data);

        // git status is no longer included here; handled by pull endpoint only

        if (data.previewUrl || data.url) {
          // Use the direct preview URL (handle both previewUrl and url for compatibility)
          const url = data.previewUrl || data.url;
          console.log('[Preview Panel] Setting preview URL:', url);
          setPreviewUrl(url);

          // Start polling for health check
          pollServerUntilReady(url);
        } else {
          throw new Error('No preview URL returned');
        }
      } catch (error) {
        const sessionText = sessionId ? `session ${sessionId}` : 'main branch';
        console.error(
          `[Preview Panel] Error fetching preview for project ${projectId} ${sessionText}:`,
          error
        );
        setError(error instanceof Error ? error.message : 'Failed to load preview');
        setStatus('error');
      } finally {
        requestInFlightRef.current = false;
      }
    },
    [projectId, sessionId, pollServerUntilReady]
  );

  // Update ref when fetchPreviewUrl changes
  useEffect(() => {
    fetchPreviewUrlRef.current = fetchPreviewUrl;
  }, [fetchPreviewUrl]);

  // Fetch the preview URL on component mount and when session changes
  useEffect(() => {
    const sessionText = sessionId ? `session ${sessionId}` : 'main branch';
    console.log(`[Preview Panel] Initializing preview for project ${projectId} ${sessionText}`);
    fetchPreviewUrlRef.current?.();
  }, [projectId, sessionId]); // Depend on both projectId and sessionId

  // Function to refresh the preview
  const handleRefresh = useCallback(
    async (forceStart: boolean = false) => {
      console.log(
        `[Preview Panel] Manually refreshing preview${forceStart ? ' (forcing start)' : ''}`
      );
      setIframeKey(prev => prev + 1);
      fetchPreviewUrl(forceStart);
    },
    [fetchPreviewUrl]
  );

  // Listen for custom refresh events from the chat interface (real-time via streaming)
  useEffect(() => {
    console.log('[Preview Panel] Setting up refresh event listener for real-time updates');

    const handleRefreshPreview = (event: CustomEvent) => {
      // Handle both session-specific and main branch refresh events
      const eventSessionId = event.detail.sessionId;
      const isMainBranchEvent = !eventSessionId || eventSessionId === 'main';
      const isCurrentSession = eventSessionId === sessionId;
      const isMainBranchActive = !sessionId;

      if (
        event.detail.projectId === projectId &&
        (isCurrentSession || (isMainBranchEvent && isMainBranchActive))
      ) {
        const sessionText = sessionId ? `session ${sessionId}` : 'main branch';
        console.log(
          `[Preview Panel] Received refresh event from chat streaming for ${sessionText}`
        );
        // Use ref to avoid circular dependencies
        fetchPreviewUrlRef.current?.();
      }
    };

    // Listen for refresh events dispatched by the chat interface SSE
    window.addEventListener('refresh-preview', handleRefreshPreview as EventListener);

    return () => {
      console.log('[Preview Panel] Cleaning up refresh event listener');
      window.removeEventListener('refresh-preview', handleRefreshPreview as EventListener);
    };
  }, [projectId, sessionId]); // Depend on both projectId and sessionId

  // Function to open the preview in a new tab
  const openInNewTab = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  }, [previewUrl]);

  // Download ZIP functionality
  const handleDownloadZip = useCallback(async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/projects/${projectId}/download`);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Failed to download project' }));
        throw new Error(errorData.error || 'Failed to download project');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading project:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download project',
      });
    } finally {
      setIsDownloading(false);
    }
  }, [projectId, projectName, toast]);

  // Get the status message based on current status
  const getStatusMessage = useCallback(() => {
    switch (status) {
      case 'ready':
        return 'Preview is ready!';
      case 'loading':
        return 'Loading preview...';
      case 'error':
        return error || 'Error loading preview.';
    }
  }, [status, error]);

  // Get the status icon type based on current status
  const getStatusIconType = useCallback(() => {
    switch (status) {
      case 'ready':
        return 'ready';
      case 'error':
        return 'error';
      default:
        return 'loading';
    }
  }, [status]);

  // Handle try again functionality
  const handleTryAgain = useCallback(async () => {
    try {
      await startPreview();
      toast({
        title: 'Success',
        description: 'Preview is starting...',
      });
      // After starting, wait a moment then refresh to get the new URL
      setTimeout(() => {
        handleRefresh();
      }, 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start preview',
      });
    }
  }, [startPreview, toast, handleRefresh]);

  return {
    // State
    status,
    progress,
    previewUrl,
    error,
    iframeKey,
    isDownloading,
    isStarting,
    // gitStatus removed

    // Actions
    handleRefresh,
    openInNewTab,
    handleDownloadZip,
    handleTryAgain,

    // Status helpers
    getStatusMessage,
    getStatusIconType,
  };
}
