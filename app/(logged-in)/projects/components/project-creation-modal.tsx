'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Folder, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProject } from '@/hooks/use-projects';
import { useProjectStore } from '@/lib/stores/projectStore';

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addProject } = useProjectStore();
  const createProjectMutation = useCreateProject();

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    createProjectMutation.mutate(
      {
        name: projectName.trim(),
        prompt: prompt || projectName.trim(),
      },
      {
                        onSuccess: (project) => {
          console.log('🎉 Project creation success callback triggered');
          console.log('📦 Project data received:', project);
          console.log('🔍 Project ID:', project?.id);
          console.log('🔍 Project type:', typeof project);

          // Ensure we have a valid project with ID
          if (project && typeof project === 'object' && project.id) {
            console.log('✅ Valid project data, proceeding with store updates and redirect');

            // Update store and invalidate queries (moved from hook)
            console.log('🔄 Adding project to store...');
            addProject(project);
            console.log('🔄 Invalidating queries...');
            queryClient.invalidateQueries({ queryKey: ['projects'] });

            const targetUrl = `/projects/${project.id}?new=true`;
            console.log('🎯 Target URL:', targetUrl);

            // Close modal and navigate immediately
            onOpenChange(false);
            console.log('🚪 Modal closed, attempting navigation...');

            // Try immediate navigation
            router.push(targetUrl);
            console.log('🔄 Router.push called with:', targetUrl);

            // Backup navigation after a short delay
            setTimeout(() => {
              console.log('⏰ Backup navigation attempt');
              window.location.href = targetUrl;
            }, 1000);

          } else {
            console.error('❌ Project created but invalid data received:', project);
            console.log('🔧 Falling back to refresh');
            onOpenChange(false);
            router.refresh();
          }
        },
        onError: (error) => {
          console.error('Error creating project:', error);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border border-border bg-card shadow-lg rounded-md">
        <DialogTitle className="sr-only">New Project</DialogTitle>
        <DialogDescription className="sr-only">
          Create a new project by entering a project name
        </DialogDescription>
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
                  if (e.key === 'Enter' && !createProjectMutation.isPending && projectName.trim()) {
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
              disabled={createProjectMutation.isPending || !projectName.trim()}
              className="h-10 space-x-2"
            >
              {createProjectMutation.isPending ? (
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
