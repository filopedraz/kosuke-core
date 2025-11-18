'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Copy, Rocket } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { ProjectStatus } from '@/lib/types/project';

interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  orgId: string | null;
  createdBy: string | null;
  createdAt: string;
  requirementsCompletedAt: string | null;
  requirementsCompletedBy: string | null;
  githubRepoUrl: string | null;
}

export default function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();

  // Fetch single project
  const { data: projects, isLoading } = useQuery<AdminProject[]>({
    queryKey: ['admin-project', id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/projects?search=${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const result = await response.json();
      return result.data.projects;
    },
  });

  const project = projects?.find(p => p.id === id);

  const handleDeploy = () => {
    toast({
      title: 'Deploy Feature Coming Soon',
      description: 'Project deployment functionality will be available soon.',
    });
  };

  const handleClone = () => {
    if (!project?.githubRepoUrl) {
      toast({
        title: 'No Repository URL',
        description: 'This project does not have a GitHub repository configured.',
        variant: 'destructive',
      });
      return;
    }

    const cloneCommand = `git clone ${project.githubRepoUrl}`;
    navigator.clipboard.writeText(cloneCommand).then(
      () => {
        toast({
          title: 'Copied to Clipboard',
          description: `Clone command copied: ${cloneCommand}`,
        });
      },
      () => {
        toast({
          title: 'Failed to Copy',
          description: 'Could not copy to clipboard.',
          variant: 'destructive',
        });
      }
    );
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'requirements':
        return <Badge variant="secondary">Requirements</Badge>;
      case 'in_development':
        return (
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
            In Development
          </Badge>
        );
      case 'active':
        return <Badge variant="default">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Project not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Title, Description, Status, and Deploy button */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(project.status)}
          <Button
            onClick={handleClone}
            variant="outline"
            disabled={!project.githubRepoUrl}
          >
            <Copy className="h-4 w-4 mr-2" />
            Clone
          </Button>
          <Button onClick={handleDeploy}>
            <Rocket className="h-4 w-4 mr-2" />
            Deploy
          </Button>
        </div>
      </div>

      {/* Project Overview Card */}
      <Card>
        <CardContent>
          {/* Project Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Project ID</h4>
                <p className="text-sm font-mono">{project.id}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Organization ID</h4>
                <p className="text-sm">{project.orgId || 'N/A'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Created By</h4>
                <p className="text-sm">{project.createdBy || 'Unknown'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">GitHub Repository</h4>
                {project.githubRepoUrl ? (
                  <Button variant="link" className="h-auto p-0 text-sm" asChild>
                    <Link
                      href={project.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {project.githubRepoUrl}
                    </Link>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Not configured</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Created At</h4>
                <p className="text-sm">
                  {new Date(project.createdAt).toLocaleString()}
                  <span className="text-muted-foreground ml-2">
                    ({formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })})
                  </span>
                </p>
              </div>

              {project.requirementsCompletedAt && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Requirements Completed
                  </h4>
                  <p className="text-sm">
                    {new Date(project.requirementsCompletedAt).toLocaleString()}
                  </p>
                  {project.requirementsCompletedBy && (
                    <p className="text-sm text-muted-foreground">
                      By: {project.requirementsCompletedBy}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href={`/projects/${project.id}`} target="_blank">
              View Project Workspace
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Card skeleton */}
      <Card>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* Actions card skeleton */}
      <Card>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

