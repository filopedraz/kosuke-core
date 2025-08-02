import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { DownloadProgress } from '@/lib/types';

// Hook for downloading project as ZIP
export function useProjectDownload(projectId: number, projectName: string) {
  const { toast } = useToast();
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    isDownloading: false,
    progress: 0,
  });

  const downloadProject = useCallback(async () => {
    setDownloadProgress({ isDownloading: true, progress: 0 });

    try {
      const response = await fetch(`/api/projects/${projectId}/download`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}.zip`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadProgress({ isDownloading: false, progress: 100 });

      toast({
        title: "Download complete",
        description: `${projectName}.zip has been downloaded.`,
      });

    } catch (error) {
      setDownloadProgress({ isDownloading: false, progress: 0 });
      
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download project",
        variant: "destructive",
      });
    }
  }, [projectId, projectName, toast]);

  return {
    downloadProgress,
    downloadProject,
    isDownloading: downloadProgress.isDownloading,
  };
}