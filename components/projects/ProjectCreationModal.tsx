'use client';

import { Folder, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createProject } from '@/lib/actions/project';

interface ProjectCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProjectName?: string;
  prompt?: string;
}

export default function ProjectCreationModal({
  open,
  onOpenChange,
  initialProjectName = '',
  prompt = '',
}: ProjectCreationModalProps) {
  const [projectName, setProjectName] = useState(initialProjectName);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    try {
      setIsLoading(true);

      // Create a new project with the prompt if provided
      const project = await createProject(prompt || projectName);

      // Close modal and redirect to the project page
      onOpenChange(false);

      if (project?.id) {
        router.push(`/projects/${project.id}?new=true`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border border-border bg-card shadow-lg rounded-md">
        <DialogTitle className="sr-only">New Project</DialogTitle>
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-8">
            <Folder className="h-5 w-5 text-primary" />
            <h3 className="text-lg">New Project</h3>
          </div>

          <div>
            <div className="space-y-5">
              <Label htmlFor="projectName" className="text-md block mb-2">
                Project name
              </Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                className="h-11"
                autoFocus
                placeholder="My awesome project"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isLoading && projectName.trim()) {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
              />
            </div>
          </div>

          <div className="mt-10 flex justify-end items-center gap-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10">
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={isLoading || !projectName.trim()}
              className="h-10 space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Create</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
