# 📋 Ticket 23: Automatic Subdomain Display UI

**Priority:** Medium
**Estimated Effort:** 2 hours

## Description

Add UI to the project settings to display automatically generated subdomains on kosuke.app based on branch names. Users can see their preview URLs but cannot modify them.

## Domain Architecture

- **Main Application**: `kosuke.ai` (Next.js app)
- **Preview Containers**: `*.kosuke.app` (Generated subdomains like `project-123-main.kosuke.app`)

## Files to Create/Update

```
app/(logged-in)/projects/[id]/components/settings/subdomain-display.tsx
app/(logged-in)/projects/[id]/components/settings/settings-tab.tsx (update)
app/(logged-in)/projects/[id]/components/settings/skeletons/subdomain-display-skeleton.tsx
app/api/projects/[id]/preview-urls/route.ts
hooks/use-preview-urls.ts
lib/types/preview-urls.ts (centralized preview URL types)
```

## Implementation Details

**lib/types/preview-urls.ts** - Centralized preview URL types:

```typescript
export interface PreviewUrl {
  id: number;
  project_id: number;
  branch_name: string;
  subdomain: string;
  full_url: string;
  container_status: 'running' | 'stopped' | 'error';
  ssl_enabled: boolean;
  created_at: string;
  last_accessed: string | null;
}

export interface PreviewUrlsResponse {
  preview_urls: PreviewUrl[];
  total_count: number;
}

export interface PreviewUrlStats {
  total_previews: number;
  active_previews: number;
  ssl_enabled_count: number;
  container_status_count: Record<string, number>;
}
```

**hooks/use-preview-urls.ts** - TanStack Query hook for preview URL management:

```typescript
import { useQuery } from '@tanstack/react-query';
import type { PreviewUrlsResponse, PreviewUrlStats } from '@/lib/types/preview-urls';
import type { ApiResponse } from '@/lib/api';

export function useProjectPreviewUrls(projectId: number) {
  return useQuery({
    queryKey: ['project-preview-urls', projectId],
    queryFn: async (): Promise<PreviewUrlsResponse> => {
      const response = await fetch(`/api/projects/${projectId}/preview-urls`);
      if (!response.ok) {
        throw new Error('Failed to fetch project preview URLs');
      }
      const data: ApiResponse<PreviewUrlsResponse> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
}

export function usePreviewUrlStats() {
  return useQuery({
    queryKey: ['preview-url-stats'],
    queryFn: async (): Promise<PreviewUrlStats> => {
      const response = await fetch('/api/preview-urls/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch preview URL stats');
      }
      const data: ApiResponse<PreviewUrlStats> = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
```

**app/(logged-in)/projects/[id]/components/settings/skeletons/subdomain-display-skeleton.tsx** - Skeleton for subdomain display:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SubdomainDisplaySkeleton() {
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
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />

            {/* Active preview URLs */}
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </div>
              ))}
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

**app/(logged-in)/projects/[id]/components/settings/subdomain-display.tsx** - Subdomain display UI:

```tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, ExternalLink, Check, Activity, Info } from 'lucide-react';
import { useProjectPreviewUrls } from '@/hooks/use-preview-urls';
import { SubdomainDisplaySkeleton } from './skeletons/subdomain-display-skeleton';
import type { PreviewUrl } from '@/lib/types/preview-urls';

interface SubdomainDisplayProps {
  projectId: number;
}

export function SubdomainDisplay({ projectId }: SubdomainDisplayProps) {
  const { data: previewData, isLoading, error } = useProjectPreviewUrls(projectId);

  if (isLoading) {
    return <SubdomainDisplaySkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load preview URLs. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const previewUrls = previewData?.preview_urls || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Preview URLs</h3>
        <p className="text-sm text-muted-foreground">
          Automatically generated subdomains for your project branches
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Active Previews
          </CardTitle>
          <CardDescription>Live preview URLs for your project branches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {previewUrls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active preview deployments</p>
              <p className="text-sm">Start a chat session to generate preview URLs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {previewUrls.map((preview: PreviewUrl) => (
                <PreviewUrlCard key={preview.id} preview={preview} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Preview URLs are automatically generated based on your branch names during chat sessions.
          Each branch gets its own subdomain like <code>project-{projectId}-main.kosuke.app</code>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function PreviewUrlCard({ preview }: { preview: PreviewUrl }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'stopped':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <a
              href={preview.full_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-1 font-medium"
            >
              {preview.full_url.replace('https://', '')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="text-sm text-muted-foreground">
            Branch: <code className="bg-muted px-1 rounded text-xs">{preview.branch_name}</code>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={getStatusColor(preview.container_status)}>
            {getStatusIcon(preview.container_status)}
            {preview.container_status}
          </Badge>
          {preview.ssl_enabled && (
            <Badge variant="outline" className="text-green-600">
              <Check className="w-3 h-3 mr-1" />
              SSL
            </Badge>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Created: {new Date(preview.created_at).toLocaleDateString()}</span>
        {preview.last_accessed && (
          <span>Last accessed: {new Date(preview.last_accessed).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
```

**app/api/projects/[id]/preview-urls/route.ts** - Preview URLs API:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import type { PreviewUrlsResponse } from '@/lib/types/preview-urls';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);

    // Proxy to Python agent to get preview URLs
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/projects/${projectId}/preview-urls`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No preview URLs found
        const emptyResponse: PreviewUrlsResponse = {
          preview_urls: [],
          total_count: 0,
        };
        return NextResponse.json({
          success: true,
          data: emptyResponse,
        });
      }
      throw new Error('Failed to fetch preview URLs from agent');
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching project preview URLs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
```

## Acceptance Criteria

- [x] Subdomain display UI in project settings
- [x] Automatic subdomain generation based on branch names
- [x] Preview URL status display with container status
- [x] SSL status indicator
- [x] Live preview URL links with external icon
- [x] Integration with Python agent preview URL service
- [x] Proper skeleton loading states
- [x] Error handling for failed API requests

---

## 🎯 Updated Production Architecture Summary

**Total Estimated Effort:** ~74 hours (reduced from custom domain management to automatic subdomain assignment)

## 🌐 Production Subdomain Solution:

1. **Infrastructure Layer:**
   - **Traefik** as reverse proxy with automatic SSL (Let's Encrypt)
   - **Cloudflare DNS** with wildcard `*.kosuke.app` → your server (previews)
   - **Docker Compose** orchestration for all services

2. **Automatic Domain Management:**
   - Subdomains generated automatically: `project-{id}-{branch}.kosuke.app`
   - Python agent creates containers with Traefik labels
   - Dynamic routing based on `Host()` rules
   - No user configuration required

3. **Routing Flow:**

   ```
   User starts chat session with branch "main"
   ↓
   Agent generates: project-123-main.kosuke.app
   ↓
   Cloudflare DNS: *.kosuke.app → Your Server (IP)
   ↓
   Traefik: Host(`project-123-main.kosuke.app`) → project container
   ↓
   Container: kosuke-preview-123 serves the app
   ```

4. **Key Benefits:**
   - ✅ **Automatic SSL** - Let's Encrypt certificates
   - ✅ **Dynamic routing** - No manual nginx config
   - ✅ **Container isolation** - Each project in separate container
   - ✅ **Branch-based URLs** - Automatic subdomain generation
   - ✅ **UI display** - Users can see their preview URLs but not modify them
   - ✅ **Simplified management** - No domain conflicts or user configuration

**This architecture scales to thousands of projects with zero user configuration overhead!** 🚀
