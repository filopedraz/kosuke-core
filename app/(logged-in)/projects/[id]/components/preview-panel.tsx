'use client';

import { Loader2, RefreshCw, ExternalLink, Download, Github } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DownloadingModal from './downloading-modal';

interface PreviewPanelProps {
  projectId: number;
  projectName: string;
  className?: string;
  initialLoading?: boolean;
}

type PreviewStatus = 'loading' | 'ready' | 'error';

export default function PreviewPanel({
  projectId,
  projectName,
  className,
  initialLoading = false,
}: PreviewPanelProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<PreviewStatus>(initialLoading ? 'loading' : 'loading');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Check if the preview server is ready
  const checkServerHealth = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Create a controller to timeout the request after 5 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // With no-cors mode, we can't read the response, but if the fetch succeeds, the server is up
      await fetch(url, { 
        method: 'HEAD', 
        mode: 'no-cors',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      return true; // If we get here, the server is responding
    } catch (error) {
      console.log('[Preview Panel] Health check failed:', error);
      return false;
    }
  }, []);

  // Poll the server until it's ready
  const pollServerUntilReady = useCallback(async (url: string, maxAttempts = 30) => {
    console.log('[Preview Panel] Starting health check polling');
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
        console.log(`[Preview Panel] Health check attempt ${attempts}/${maxAttempts} failed`);
        setTimeout(poll, 2000); // Try again after 2 seconds
      }
    };
    
    await poll();
  }, [checkServerHealth]);

  // Fetch the preview URL
  const fetchPreviewUrl = useCallback(async () => {
    setStatus('loading');
    setProgress(0);
    setError(null);
    
    try {
      console.log(`[Preview Panel] Fetching preview URL for project ${projectId}`);
      const response = await fetch(`/api/projects/${projectId}/preview`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to fetch preview: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Preview Panel] Preview URL response:', data);
      
      if (data.previewUrl) {
        // Use the direct preview URL instead of the proxy
        console.log('[Preview Panel] Setting preview URL:', data.previewUrl);
        setPreviewUrl(data.previewUrl);
        
        // Start polling for health check
        pollServerUntilReady(data.previewUrl);
      } else {
        throw new Error('No preview URL returned');
      }
    } catch (error) {
      console.error('[Preview Panel] Error fetching preview URL:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setStatus('error');
    }
  }, [projectId, pollServerUntilReady]);

  // Fetch the preview URL on component mount
  useEffect(() => {
    console.log(`[Preview Panel] Initializing preview for project ${projectId}`);
    fetchPreviewUrl();
  }, [projectId, fetchPreviewUrl]);

  // Function to refresh the preview
  const handleRefresh = async () => {
    console.log('[Preview Panel] Manually refreshing preview');
    setIframeKey(prev => prev + 1);
    setLastRefresh(Date.now());
    fetchPreviewUrl();
  };

  // Add polling to check for new messages and refresh when needed
  useEffect(() => {
    console.log('[Preview Panel] Setting up message polling mechanism');
    
    const checkForChanges = async () => {
      try {
        console.log('[Preview Panel] Checking for new messages...');
        const response = await fetch(`/api/projects/${projectId}/messages/latest`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.timestamp) {
            const messageTime = new Date(data.timestamp).getTime();
            const refreshTime = lastRefresh;
            
            console.log(`[Preview Panel] Latest message: ${new Date(messageTime).toISOString()}, Last refresh: ${new Date(refreshTime).toISOString()}`);
            
            // If there's a new assistant message after our last refresh, update the preview
            if (messageTime > refreshTime && data.role === 'assistant') {
              console.log('[Preview Panel] New assistant message detected, refreshing preview');
              handleRefresh();
            }
          }
        }
      } catch (error) {
        console.error('[Preview Panel] Error checking for new messages:', error);
      }
    };
    
    // Check for new messages every 3 seconds
    const messageCheckId = setInterval(checkForChanges, 3000);
    
    // Also check immediately on mount
    checkForChanges();
    
    return () => {
      console.log('[Preview Panel] Cleaning up message polling');
      clearInterval(messageCheckId);
    };
  }, [projectId, lastRefresh, handleRefresh]);
  
  // Keep event listener for manual refresh from other parts of the UI
  useEffect(() => {
    const handleRefreshPreview = (event: CustomEvent<{projectId: number}>) => {
      if (event.detail.projectId === projectId) {
        console.log('[Preview Panel] Refresh preview event received, refreshing preview');
        handleRefresh();
      }
    };

    console.log(`[Preview Panel] Adding refresh-preview event listener for project ${projectId}`);
    window.addEventListener('refresh-preview', handleRefreshPreview as EventListener);

    return () => {
      console.log(`[Preview Panel] Removing refresh-preview event listener for project ${projectId}`);
      window.removeEventListener('refresh-preview', handleRefreshPreview as EventListener);
    };
  }, [projectId, handleRefresh]);

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
            onClick={handleRefresh}
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
                  onClick={handleRefresh}
                  className="mt-4 text-primary hover:underline"
                  data-testid="try-again-button"
                >
                  Try again
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
                onClick={handleRefresh}
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