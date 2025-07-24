# 📋 Ticket 23: Custom Domain Management UI

**Priority:** High  
**Estimated Effort:** 4 hours

## Description

Add UI to the project settings for managing custom subdomains. Users can set their subdomain and see deployment status.

## Files to Create/Update

```
app/(logged-in)/projects/[id]/components/settings/domain-management.tsx
app/(logged-in)/projects/[id]/components/settings/settings-tab.tsx (update)
app/(logged-in)/projects/[id]/components/settings/skeletons/domain-management-skeleton.tsx
app/api/projects/[id]/domain/route.ts
hooks/use-custom-domains.ts
hooks/use-domain-operations.ts
lib/types/domains.ts (centralized domain types)
```

## Implementation Details

**lib/types/domains.ts** - Centralized domain types:

```typescript
export interface ProjectDomain {
  id: number;
  project_id: number;
  subdomain: string;
  full_domain: string;
  is_active: boolean;
  ssl_enabled: boolean;
  dns_configured: boolean;
  deployment_status: 'pending' | 'deploying' | 'deployed' | 'failed';
  last_deployed: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDomainData {
  subdomain: string;
}

export interface UpdateDomainData {
  subdomain?: string;
  is_active?: boolean;
}

export interface DomainValidation {
  subdomain: string;
  is_available: boolean;
  is_valid: boolean;
  error_message?: string;
}

export interface DomainDeployment {
  id: number;
  domain_id: number;
  status: 'pending' | 'deploying' | 'deployed' | 'failed';
  deployment_url?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface DomainStats {
  total_domains: number;
  active_domains: number;
  ssl_enabled_count: number;
  deployment_status_count: Record<string, number>;
}
```

**hooks/use-custom-domains.ts** - TanStack Query hook for domain management:

```typescript
import { useQuery } from '@tanstack/react-query';
import type { ProjectDomain, DomainStats, DomainValidation } from '@/lib/types/domains';
import type { ApiResponse } from '@/lib/api';

export function useProjectDomain(projectId: number) {
  return useQuery({
    queryKey: ['project-domain', projectId],
    queryFn: async (): Promise<ProjectDomain | null> => {
      const response = await fetch(`/api/projects/${projectId}/domain`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No domain configured
        }
        throw new Error('Failed to fetch project domain');
      }
      const data: ApiResponse<ProjectDomain> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useDomainValidation(subdomain: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['domain-validation', subdomain],
    queryFn: async (): Promise<DomainValidation> => {
      const response = await fetch(
        `/api/domains/validate?subdomain=${encodeURIComponent(subdomain)}`
      );
      if (!response.ok) {
        throw new Error('Failed to validate domain');
      }
      const data: ApiResponse<DomainValidation> = await response.json();
      return data.data;
    },
    enabled: enabled && !!subdomain && subdomain.length > 0,
    staleTime: 1000 * 30, // 30 seconds
    retry: 1,
  });
}

export function useDomainStats() {
  return useQuery({
    queryKey: ['domain-stats'],
    queryFn: async (): Promise<DomainStats> => {
      const response = await fetch('/api/domains/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch domain stats');
      }
      const data: ApiResponse<DomainStats> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
}
```

**hooks/use-domain-operations.ts** - TanStack Query mutations for domain operations:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { CreateDomainData, UpdateDomainData, ProjectDomain } from '@/lib/types/domains';
import type { ApiResponse } from '@/lib/api';

export function useCreateDomain(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDomainData): Promise<ProjectDomain> => {
      const response = await fetch(`/api/projects/${projectId}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create domain');
      }

      const result: ApiResponse<ProjectDomain> = await response.json();
      return result.data;
    },
    onSuccess: domain => {
      queryClient.invalidateQueries({ queryKey: ['project-domain', projectId] });
      queryClient.invalidateQueries({ queryKey: ['domain-stats'] });
      toast({
        title: 'Domain Created',
        description: `Created domain: ${domain.full_domain}`,
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Create Domain',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateDomain(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDomainData): Promise<ProjectDomain> => {
      const response = await fetch(`/api/projects/${projectId}/domain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update domain');
      }

      const result: ApiResponse<ProjectDomain> = await response.json();
      return result.data;
    },
    onSuccess: domain => {
      queryClient.invalidateQueries({ queryKey: ['project-domain', projectId] });
      toast({
        title: 'Domain Updated',
        description: `Updated domain: ${domain.full_domain}`,
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Update Domain',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDomain(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch(`/api/projects/${projectId}/domain`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete domain');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-domain', projectId] });
      queryClient.invalidateQueries({ queryKey: ['domain-stats'] });
      toast({
        title: 'Domain Deleted',
        description: 'The custom domain has been removed successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Delete Domain',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeployDomain(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch(`/api/projects/${projectId}/domain/deploy`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to deploy domain');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-domain', projectId] });
      toast({
        title: 'Deployment Started',
        description: 'Your domain deployment has been initiated.',
      });
    },
    onError: error => {
      toast({
        title: 'Deployment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

**app/(logged-in)/projects/[id]/components/settings/skeletons/domain-management-skeleton.tsx** - Skeleton for domain management:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DomainManagementSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/settings/domain-management.tsx** - Domain management UI:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, ExternalLink, Check, AlertCircle } from 'lucide-react';

interface ProjectDomain {
  id: number;
  subdomain: string;
  full_domain: string;
  is_active: boolean;
  ssl_enabled: boolean;
  last_deployed: string;
}

interface DomainManagementProps {
  projectId: number;
}

export function DomainManagement({ projectId }: DomainManagementProps) {
  const [domain, setDomain] = useState<ProjectDomain | null>(null);
  const [newSubdomain, setNewSubdomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDomain();
  }, [projectId]);

  async function fetchDomain() {
    try {
      const response = await fetch(`/api/projects/${projectId}/domain`);
      if (response.ok) {
        const data = await response.json();
        setDomain(data.domain);
        setNewSubdomain(data.domain?.subdomain || '');
      }
    } catch (error) {
      console.error('Error fetching domain:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveDomain() {
    if (!newSubdomain.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: newSubdomain.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setDomain(data.domain);
      }
    } catch (error) {
      console.error('Error saving domain:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading domain settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Custom Domain</h3>
        <p className="text-sm text-muted-foreground">
          Set a custom subdomain for your project's production deployment
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Project URL
          </CardTitle>
          <CardDescription>
            Your project will be accessible at this URL in production
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                value={newSubdomain}
                onChange={e => setNewSubdomain(e.target.value)}
                placeholder="my-project"
                className="flex-1"
              />
              <span className="text-muted-foreground">.kosuke.ai</span>
            </div>
          </div>

          {domain && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={domain.is_active ? 'default' : 'secondary'}>
                  {domain.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {domain.ssl_enabled && (
                  <Badge variant="outline" className="text-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    SSL Enabled
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://${domain.full_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline flex items-center gap-1"
                >
                  {domain.full_domain}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {domain.last_deployed && (
                <div className="text-sm text-muted-foreground">
                  Last deployed: {new Date(domain.last_deployed).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <Button onClick={saveDomain} disabled={saving || !newSubdomain.trim()} className="w-full">
            {saving ? 'Saving...' : domain ? 'Update Domain' : 'Create Domain'}
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          After setting your subdomain, it may take a few minutes for DNS changes to propagate. SSL
          certificates are automatically generated and renewed.
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

**app/api/projects/[id]/domain/route.ts** - Domain management API:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectDomains, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);

    const domain = await db
      .select()
      .from(projectDomains)
      .where(eq(projectDomains.projectId, projectId))
      .limit(1);

    return NextResponse.json({ domain: domain[0] || null });
  } catch (error) {
    console.error('Error fetching project domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const { subdomain } = await request.json();

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Proxy to Python agent to create domain
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/domains/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        subdomain,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to create domain', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating project domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Acceptance Criteria

- [x] Domain management UI in project settings
- [x] Subdomain validation and creation
- [x] SSL status display
- [x] Live domain link with external icon
- [x] Integration with Python agent domain service

---

## 🎯 Updated Production Architecture Summary

**Total Estimated Effort:** ~78 hours (added testing infrastructure + pre-commit hooks + subdomain routing)

## 🌐 Production Subdomain Solution:

1. **Infrastructure Layer:**

   - **Traefik** as reverse proxy with automatic SSL (Let's Encrypt)
   - **Cloudflare DNS** with wildcard `*.kosuke.ai` → your server
   - **Docker Compose** orchestration for all services

2. **Domain Management:**

   - Database tracks project subdomains
   - Python agent creates containers with Traefik labels
   - Dynamic routing based on `Host()` rules

3. **Routing Flow:**

   ```
   User visits: open-idealista.kosuke.ai
   ↓
   Cloudflare DNS: *.kosuke.ai → Your Server (IP)
   ↓
   Traefik: Host(`open-idealista.kosuke.ai`) → project container
   ↓
   Container: kosuke-preview-123 serves the app
   ```

4. **Key Benefits:**
   - ✅ **Automatic SSL** - Let's Encrypt certificates
   - ✅ **Dynamic routing** - No manual nginx config
   - ✅ **Container isolation** - Each project in separate container
   - ✅ **Database tracking** - All domains stored in postgres
   - ✅ **UI management** - Users set subdomains in project settings

**This architecture scales to thousands of projects with minimal infrastructure overhead!** 🚀
