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
import { useDeleteProject } from '@/hooks/use-projects';
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
  const { mutate: deleteProject, isPending, isSuccess, isError } = useDeleteProject();
  const [deleteStage, setDeleteStage] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const operationStartedRef = useRef<boolean>(false);
  
  // Clear timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);
  
  // Handle the deletion progress visualization
  useEffect(() => {
    // When operation starts
    if (isPending && !operationStartedRef.current) {
      operationStartedRef.current = true;
      setDeleteStage('Preparing to delete project...');
      setDeleteProgress(10);
      
      // Clear any existing timers
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
      
      // Set up progressive indicators for better UX
      const stages = [
        { time: 800, stage: 'Cleaning up project files...', progress: 25 },
        { time: 2000, stage: 'Removing node_modules...', progress: 40 },
        { time: 4000, stage: 'Deleting project directory...', progress: 60 },
        // Don't go to 100% - we'll do that when operation actually completes
        { time: 6000, stage: 'Finalizing deletion...', progress: 85 },
      ];
      
      stages.forEach(({ time, stage, progress }) => {
        const timer = setTimeout(() => {
          if (isPending) {
            setDeleteStage(stage);
            setDeleteProgress(progress);
          }
        }, time);
        
        timersRef.current.push(timer);
      });
    }
    
    // When operation succeeds
    if (isSuccess && !isCompleting && operationStartedRef.current) {
      setDeleteStage('Project deleted successfully!');
      setDeleteProgress(100);
      setIsCompleting(true);
      
      // Add a delay before closing to show the success state
      const timer = setTimeout(() => {
        onOpenChange(false);
        
        // Reset state after dialog closes
        setTimeout(() => {
          setDeleteStage(null);
          setDeleteProgress(0);
          setIsCompleting(false);
          operationStartedRef.current = false;
        }, 300);
      }, 1000);
      
      timersRef.current.push(timer);
    }
    
    // When operation errors
    if (isError && operationStartedRef.current) {
      setDeleteStage('Error deleting project. Please try again.');
      setDeleteProgress(0);
      operationStartedRef.current = false;
    }
  }, [isPending, isSuccess, isError, isCompleting, onOpenChange]);

  const handleDelete = async () => {
    try {
      // Reset state for new deletion attempt
      operationStartedRef.current = false;
      setIsCompleting(false);
      
      // Trigger the deletion
      deleteProject(project.id);
    } catch (error) {
      console.error('Error deleting project:', error);
      setDeleteStage('Error deleting project. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      // Prevent closing while operation is in progress
      if (isPending || isCompleting) return;
      onOpenChange(value);
    }}>
      <DialogContent className="sm:max-w-[425px] border border-border bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trash className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Project</DialogTitle>
          </div>
          <DialogDescription>
            {!isPending && !isSuccess ? (
              <>Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone
              and all project files will be permanently removed.</>
            ) : (
              <>Deleting project files. This may take a moment, please don&apos;t close this window.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {(isPending || isSuccess) && (
          <div className="py-4">
            <div className="flex items-center mb-2">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-green-500 mr-2" />
              )}
              <span className="text-sm text-muted-foreground">{deleteStage}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ease-in-out ${
                  isSuccess ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${deleteProgress}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isPending || isCompleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || isCompleting}
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