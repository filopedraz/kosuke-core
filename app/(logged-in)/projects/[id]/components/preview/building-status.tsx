'use client';

import { AlertCircle, CheckCircle2, Code, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BuildingStatusProps {
  projectId: number;
  initialLoading?: boolean;
  className?: string;
}

type BuildStatus =
  | 'building'
  | 'compiling'
  | 'ready'
  | 'error';

export default function BuildingStatus({
  projectId,
  initialLoading = true,
  className
}: BuildingStatusProps) {
  const [status, setStatus] = useState<BuildStatus>(initialLoading ? 'building' : 'ready');
  const [visible, setVisible] = useState(initialLoading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Check the preview server status to see if compilation is complete
  const checkPreviewStatus = useCallback(async () => {
    console.log(`🔍 Checking preview status for project ${projectId}`);
    try {
      const res = await fetch(`/api/projects/${projectId}/preview`);
      if (!res.ok) {
        console.log(`⏳ Preview not ready yet for project ${projectId}: ${res.status} ${res.statusText}`);
        return false;
      }

      const data = await res.json();
      if (data.previewUrl) {
        console.log(`✅ Preview is ready at ${data.previewUrl} for project ${projectId}`);
        return true;
      } else {
        console.log(`⏳ No preview URL found for project ${projectId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error checking preview status for project ${projectId}:`, error);
      return false;
    }
  }, [projectId]);

  // Reset error state and retry
  const handleRetry = useCallback(() => {
    console.log(`🔄 Retrying preview initialization`);
    setErrorMessage(null);
    setStatus('building');
    setProgress(10);
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      setVisible(false);
      return;
    }

    // Set initial status
    setStatus('building');
    setVisible(true);
    setErrorMessage(null);
    setProgress(10);

    // Building state Timer
    console.log(`🏗️ Starting building state for project ${projectId}`);
    const buildingTimeout = setTimeout(() => {
      console.log(`🔍 Moving to compiling state for project ${projectId}`);
      setStatus('compiling');
      setProgress(50);

      // Start checking preview status periodically
      let previewCheckInterval: NodeJS.Timeout;
      const startPreviewChecks = () => {
        console.log(`🔄 Starting periodic preview status checks for project ${projectId}`);
        previewCheckInterval = setInterval(async () => {
          const isPreviewReady = await checkPreviewStatus();
          if (isPreviewReady) {
            console.log(`✅ Preview is ready for project ${projectId}`);
            clearInterval(previewCheckInterval);

            setStatus('ready');
            setProgress(100);

            // Hide after a short delay
            setTimeout(() => setVisible(false), 2000);
          }
        }, 3000); // Check every 3 seconds
      };

      // Start checking after a brief delay
      setTimeout(startPreviewChecks, 2000);

      return () => {
        clearInterval(previewCheckInterval);
      };
    }, 3000);

    return () => clearTimeout(buildingTimeout);
  }, [projectId, initialLoading]); // checkPreviewStatus is stable with useCallback

  if (!visible) return null;

  const getStatusMessage = () => {
    switch (status) {
      case 'building':
        return 'Setting up your project...';
      case 'compiling':
        return 'Compiling your Next.js application...';
      case 'ready':
        return 'Preview is ready!';
      case 'error':
        return errorMessage || 'Error building project.';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-5 w-5 text-green-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'compiling':
        return <Code className="h-5 w-5 text-primary animate-pulse" />;
      default:
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    }
  };

  return (
    <Card className={cn(
      'fixed bottom-6 right-6 z-50 max-w-sm border border-border bg-background px-3 py-3 shadow-lg',
      className
    )}>
      <CardContent className="p-2 flex flex-col gap-3">
        <div className="flex items-center gap-3 mb-1">
          {getStatusIcon()}
          <p className="text-sm font-medium">{getStatusMessage()}</p>
        </div>

        <Progress value={progress} className="h-1.5 w-full max-w-xs" />

        {status === 'error' && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            className="w-full"
          >
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
