'use client';

import { Download, ExternalLink, Github, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { usePreviewStart } from '@/hooks/use-preview';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DownloadingModal from './downloading-modal';

interface PreviewPanelProps {
  projectId: number;
  projectName: string;
  className?: string;
}

type PreviewStatus = 'loading' | 'ready' | 'error';

export default function PreviewPanel({
  projectId,
  projectName,
  className,
}: PreviewPanelProps) {
  const { toast } = useToast();
  const { startPreview, isStarting } = usePreviewStart(projectId);
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check if the preview server is ready
  const checkServerHealth = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Create a controller to timeout the request after 3 seconds (reduced from 5)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // With no-cors mode, we can't read the response, but if the fetch succeeds, the server is up
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true; // If we get here, the server is responding
    } catch (error) {
      // Only log every 5th failure to reduce console noise
      if (Math.random() < 0.2) {
        console.log('[Preview Panel] Health check failed (sample):', error instanceof Error ? error.message : 'Connection failed');
      }
      return false;
    }
  }, []);

  // Poll the server until it's ready
  const pollServerUntilReady = useCallback(async (url: string, maxAttempts = 30) => {
    console.log('[Preview Panel] Starting health check polling (will wait 5s before first attempt)');
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
        console.log(`[Preview Panel] Health check attempt ${attempts}/${maxAttempts} failed, retrying in 3s`);
        // Use longer delays for more patient polling
        const delay = attempts <= 3 ? 5000 : 3000; // 5s for first 3 attempts, then 3s
        setTimeout(poll, delay);
      }
    };

    // Wait 5 seconds before starting health checks to give container time to start
    setTimeout(poll, 5000);
  }, [checkServerHealth]);

    // Prevent multiple simultaneous requests
  const [, setIsRequestInProgress] = useState(false);

  // Ref to store fetchPreviewUrl function to avoid circular dependencies
  const fetchPreviewUrlRef = useRef<((forceStart?: boolean) => Promise<void>) | null>(null);

  // Fetch the preview URL
  const fetchPreviewUrl = useCallback(async (forceStart: boolean = false) => {
    // Prevent duplicate requests using functional state update
    let shouldProceed = false;
    setIsRequestInProgress(prev => {
      if (prev) {
        console.log(`[Preview Panel] Request already in progress for project ${projectId}, skipping`);
        return prev; // Don't change state, request already in progress
      }
      shouldProceed = true;
      return true; // Set to true, we'll proceed
    });

    if (!shouldProceed) {
      return;
    }
    setStatus('loading');
    setProgress(0);
    setError(null);

    try {
      console.log(`[Preview Panel] Fetching preview URL for project ${projectId}${forceStart ? ' (forcing refresh)' : ''}`);

      // Always use GET - it will auto-start if the preview is not running
      const response = await fetch(`/api/projects/${projectId}/preview`, {
        method: 'GET',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to fetch preview: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[Preview Panel] Preview status response:`, data);

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
      console.error(`[Preview Panel] Error fetching preview for project ${projectId}:`, error);
      setError(error instanceof Error ? error.message : 'Failed to load preview');
      setStatus('error');
    } finally {
      setIsRequestInProgress(false);
    }
  }, [projectId, pollServerUntilReady]);

  // Update ref when fetchPreviewUrl changes
  useEffect(() => {
    fetchPreviewUrlRef.current = fetchPreviewUrl;
  }, [fetchPreviewUrl]);

  // Fetch the preview URL on component mount
  useEffect(() => {
    console.log(`[Preview Panel] Initializing preview for project ${projectId}`);
    fetchPreviewUrlRef.current?.();
  }, [projectId]); // Only depend on projectId to avoid circular dependencies

  // Function to refresh the preview
  const handleRefresh = useCallback(async (forceStart: boolean = false) => {
    console.log(`[Preview Panel] Manually refreshing preview${forceStart ? ' (forcing start)' : ''}`);
    setIframeKey(prev => prev + 1);
    fetchPreviewUrl(forceStart);
  }, [fetchPreviewUrl]);

  // Listen for custom refresh events from the chat interface (real-time via streaming)
  useEffect(() => {
    console.log('[Preview Panel] Setting up refresh event listener for real-time updates');

    const handleRefreshPreview = (event: CustomEvent) => {
      if (event.detail.projectId === projectId) {
        console.log('[Preview Panel] Received refresh event from chat streaming');
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
  }, [projectId]); // Only depend on projectId to avoid circular dependencies

  // Function to open the preview in a new tab
  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  // Get the status message based on current status
  const getStatusMessage = () => {
    switch (status) {
      case 'ready':
        return 'Preview is ready!';
      case 'loading':
        return 'Loading preview...';
      case 'error':
        return error || 'Error loading preview.';
    }
  };

  // Get the status icon based on current status
  const getStatusIcon = () => {
    switch (status) {
      case 'ready':
        return <Loader2 className="h-6 w-6 text-green-500" />;
      case 'error':
        return <Loader2 className="h-6 w-6 text-red-500 animate-spin" />;
      default:
        return <Loader2 className="h-6 w-6 text-primary animate-spin" />;
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/projects/${projectId}/download`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to download project' }));
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
        variant: "destructive",
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Failed to download project',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={cn('flex flex-col h-full w-full overflow-hidden', className)} data-testid="preview-panel">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="text-sm font-medium">Preview</h3>
        <div className="flex items-center space-x-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Download project"
                title="Download project"
                disabled={isDownloading}
              >
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="flex items-center"
                disabled
              >
                <Github className="mr-2 h-4 w-4" />
                <span>Create GitHub Repo</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center"
                onClick={handleDownloadZip}
                disabled={isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                <span>Download ZIP</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {previewUrl && status === 'ready' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={openInNewTab}
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRefresh()}
            disabled={status === 'loading'}
            aria-label="Refresh preview"
            title="Refresh preview"
          >
            <RefreshCw className={cn("h-4 w-4", status === 'loading' && "animate-spin")} />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          {status !== 'ready' ? (
            <div className="flex h-full items-center justify-center flex-col p-6">
              {getStatusIcon()}
              <span className="text-sm font-medium mt-4 mb-2">{getStatusMessage()}</span>
              {status === 'loading' && (
                <Progress value={progress} className="h-1.5 w-full max-w-xs mt-2" />
              )}
              {status === 'error' && (
                <button
                  onClick={async () => {
                    try {
                      await startPreview({
                        successMessage: 'Preview is starting...',
                        onSuccess: () => {
                          // After starting, wait a moment then refresh to get the new URL
                          setTimeout(() => {
                            handleRefresh();
                          }, 2000);
                        }
                      });
                    } catch {
                      // Error is already handled by the hook
                    }
                  }}
                  className="mt-4 text-primary hover:underline disabled:opacity-50"
                  disabled={isStarting}
                  data-testid="try-again-button"
                >
                  {isStarting ? 'Starting...' : 'Try again'}
                </button>
              )}
            </div>
          ) : previewUrl ? (
            <iframe
              key={iframeKey}
              src={previewUrl}
              className="h-full w-full border-0"
              title={`Preview of ${projectName}`}
              sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4">
              <p className="mb-4 text-center text-muted-foreground">
                No preview available yet. Click the refresh button to generate a preview.
              </p>
              <button
                onClick={() => handleRefresh(true)}
                className="text-primary hover:underline"
                data-testid="generate-preview-button"
              >
                Generate Preview
              </button>
            </div>
          )}
        </div>
      </div>
      <DownloadingModal open={isDownloading} />
    </div>
  );
}
