'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, Trash } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDeleteProject } from '@/lib/hooks/useProjects';
import { Project } from '@/lib/stores/projectStore';

interface DeleteProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const { mutate: deleteProject, isPending } = useDeleteProject();
  const [deleteStage, setDeleteStage] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  // Simulate progress for better UX during deletion
  useEffect(() => {
    // Clear previous timers when component unmounts or deletion state changes
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);
  
  // Start the progress indication when isPending changes
  useEffect(() => {
    if (isPending) {
      // Reset state at the beginning
      setDeleteStage('Preparing to delete project...');
      setDeleteProgress(10);
      
      // Clear any existing timers
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
      
      // Define the progress stages with timing
      const stages = [
        { time: 500, stage: 'Cleaning up project files...', progress: 30 },
        { time: 1500, stage: 'Removing node_modules...', progress: 50 },
        { time: 3000, stage: 'Deleting project files...', progress: 70 },
        { time: 5000, stage: 'Finalizing deletion...', progress: 90 }
      ];
      
      // Set up the timers for each stage
      stages.forEach(({ time, stage, progress }) => {
        const timer = setTimeout(() => {
          if (isPending) { // Check if still pending
            setDeleteStage(stage);
            setDeleteProgress(progress);
          }
        }, time);
        
        timersRef.current.push(timer);
      });
    } else if (!isPending && deleteProgress > 0) {
      // When deletion completes, reset after a short delay
      const resetTimer = setTimeout(() => {
        setDeleteStage(null);
        setDeleteProgress(0);
      }, 500);
      
      timersRef.current.push(resetTimer);
    }
  }, [isPending]);

  const handleDelete = async () => {
    try {
      await deleteProject(project.id);
      // Don't close immediately to allow seeing the completion
      setTimeout(() => onOpenChange(false), 800);
    } catch (error) {
      console.error('Error deleting project:', error);
      setDeleteStage('Error deleting project. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (isPending) return; // Prevent closing while deleting
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-[425px] border border-border bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trash className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Project</DialogTitle>
          </div>
          <DialogDescription>
            {!isPending ? (
              <>Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone
              and all project files will be permanently removed.</>
            ) : (
              <>Deleting project files. This may take a moment, please don&apos;t close this window.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {isPending && (
          <div className="py-4">
            <div className="flex items-center mb-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">{deleteStage}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${deleteProgress}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Deleting...</span>
              </>
            ) : (
              'Delete Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 