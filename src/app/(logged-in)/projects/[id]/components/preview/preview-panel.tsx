'use client';

import { CheckCircle, Download, ExternalLink, Github, GitPullRequest, Loader2, RefreshCw, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePreviewPanel } from '@/hooks/use-preview-panel';
import { useDefaultBranchSettings } from '@/hooks/use-project-settings';
import { usePullBranch } from '@/hooks/use-pull-branch';
import { cn } from '@/lib/utils';
import DownloadingModal from './downloading-modal';

interface PreviewPanelProps {
  projectId: number;
  projectName: string;
  sessionId: string;
  branch?: string;
  className?: string;
}

export default function PreviewPanel({
  projectId,
  projectName,
  sessionId,
  branch,
  className,
}: PreviewPanelProps) {
  // Resolve effective session to use for preview: chat session if provided, else default branch
  const { data: defaultBranchSettings } = useDefaultBranchSettings(projectId);
  const effectiveSessionId = sessionId || defaultBranchSettings?.default_branch || '';
  const {
    // State
    status,
    progress,
    previewUrl,
    iframeKey,
    isDownloading,
    isStarting,
    // Actions
    handleRefresh,
    openInNewTab,
    handleDownloadZip,
    handleTryAgain,
    // Status helpers
    getStatusMessage,
    getStatusIconType,
  } = usePreviewPanel({ projectId, sessionId: effectiveSessionId, projectName });
  const isPreviewEnabled = Boolean(effectiveSessionId);

  // Pull branch hook
  const { mutateAsync: pullBranch, isPending: isPulling } = usePullBranch({
    projectId,
    sessionId: effectiveSessionId,
    onSuccess: () => {
      // Refresh preview after successful pull
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    },
  });

  // Handle pull branch
  const handlePullBranch = async () => {
    try {
      await pullBranch();
    } catch (error) {
      // Error handling is done in the hook
      console.error('Pull failed:', error);
    }
  };

  // Render status icon based on status type
  const renderStatusIcon = () => {
    const iconType = getStatusIconType();
    switch (iconType) {
      case 'ready':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Loader2 className="h-6 w-6 text-primary animate-spin" />;
    }
  };

  // Render git status badge (removed main-only behavior)
  const renderGitStatus = () => null;
  // Determine branch name to display
  const displayBranch = branch || effectiveSessionId || 'branch';

  // Get tooltip message based on branch type and state
  const getTooltipMessage = () => {
    const label = effectiveSessionId;
    if (isPulling) return `Pulling latest changes from ${label}...`;
    return `Pull latest changes from ${label}`;
  };

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full w-full overflow-hidden', className)} data-testid="preview-panel">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Preview</h3>
            <Badge variant="secondary" className="text-xs">
              {displayBranch}
              {renderGitStatus()}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
              <Button
                  variant="ghost"
                  size="sm"
                onClick={handlePullBranch}
                disabled={!isPreviewEnabled || isPulling || status === 'loading'}
                  aria-label="Pull latest changes"
                  className="h-6 px-2"
                >
                  <GitPullRequest className={cn("h-3 w-3", isPulling && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getTooltipMessage()}</p>
              </TooltipContent>
            </Tooltip>
          </div>
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
            disabled={!isPreviewEnabled || status === 'loading'}
            aria-label="Refresh preview"
            title="Refresh preview"
          >
            <RefreshCw className={cn("h-4 w-4", status === 'loading' && "animate-spin")} />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          {(!isPreviewEnabled || status !== 'ready') ? (
            <div className="flex h-full items-center justify-center flex-col p-6">
              {isPreviewEnabled ? renderStatusIcon() : null}
              <span className="text-sm font-medium mt-4 mb-2">
                {isPreviewEnabled ? getStatusMessage() : 'Waiting for default branch settings...'}
              </span>
              {status === 'loading' && (
                <Progress value={progress} className="h-1.5 w-full max-w-xs mt-2" />
              )}
              {status === 'error' && (
                <button
                  onClick={handleTryAgain}
                  className="mt-4 text-primary hover:underline disabled:opacity-50"
                  disabled={!isPreviewEnabled || isStarting}
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
    </TooltipProvider>
  );
}
