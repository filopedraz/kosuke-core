'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, MoreHorizontal, Trash } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Project } from '@/lib/db/schema';
import { useUser } from '@clerk/nextjs';
import DeleteProjectDialog from './delete-project-dialog';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user } = useUser();

  const handleOpenDeleteDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Close dropdown first, then show delete dialog
    setDropdownOpen(false);
    setShowDeleteDialog(true);
  };

  // Check if project is imported and GitHub is disconnected
  const githubAccount = user?.externalAccounts?.find(
    account => account.verification?.strategy === 'oauth_github'
  );
  const isImportedProject = project.isImported;
  const needsReconnection = isImportedProject && !githubAccount;

  return (
    <>
      <Link
        href={needsReconnection ? '#' : `/projects/${project.id}`}
        className={`block group ${needsReconnection ? 'pointer-events-none' : ''}`}
      >
        <Card className={`overflow-hidden h-full transition-all duration-300 border border-border relative bg-card pb-0 min-h-[140px] ${
          needsReconnection
            ? ''
            : 'hover:border-muted group-hover:translate-y-[-2px]'
        }`}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
                  {project.name}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {needsReconnection && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center pointer-events-auto">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reconnect Github</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.preventDefault()}>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem
                      onClick={handleOpenDeleteDialog}
                      className="focus:bg-muted"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Delete Project</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
            </span>
          </CardContent>
          <div className="absolute inset-0 bg-linear-to-b from-transparent to-muted/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </Card>
      </Link>

      <DeleteProjectDialog
        project={project}
        isImported={isImportedProject}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}
