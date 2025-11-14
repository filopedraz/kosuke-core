'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { ProjectStatus } from '@/lib/types/project';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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
}

export default function AdminProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all projects
  const { data: projects = [], isLoading } = useQuery<AdminProject[]>({
    queryKey: ['admin-projects', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/projects?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch projects');

      const data = await response.json();
      return data.data.projects;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Mark project as ready mutation
  const markAsReadyMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/admin/projects/${projectId}/mark-ready`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to mark project as ready');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast({
        title: 'Success',
        description: 'Project marked as ready. Notification emails sent.',
      });
    },
    onError: error => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark project as ready',
        variant: 'destructive',
      });
    },
  });

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
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin - Projects Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage projects across all organizations
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter projects</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by project name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="requirements">Requirements</SelectItem>
              <SelectItem value="in_development">In Development</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Projects ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map(project => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {project.orgId || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/projects/${project.id}`} target="_blank">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          {project.status === 'in_development' && (
                            <Button
                              size="sm"
                              onClick={() => markAsReadyMutation.mutate(project.id)}
                              disabled={markAsReadyMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Mark Ready
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

