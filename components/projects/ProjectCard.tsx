'use client';

import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Trash } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteProject } from '@/lib/hooks/useProjects';
import { Project } from '@/lib/stores/projectStore';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { mutate: deleteProject, isPending } = useDeleteProject();
  
  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(project.id);
    }
  };
  
  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card className="overflow-hidden h-full transition-all duration-300 border border-border hover:border-muted relative group-hover:translate-y-[-2px] bg-card">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl font-medium group-hover:text-primary transition-colors">
                {project.name}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.preventDefault()}>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem 
                  onClick={handleArchive} 
                  disabled={isPending}
                  className="focus:bg-muted"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  <span>{isPending ? 'Deleting...' : 'Delete Project'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {project.description || 'No description provided'}
          </p>
        </CardContent>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </Card>
    </Link>
  );
} 