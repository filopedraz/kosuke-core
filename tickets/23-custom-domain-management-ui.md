# 📋 Ticket 23: Custom Domain Management UI

**Priority:** High  
**Estimated Effort:** 4 hours

## Description

Add UI to the project settings for managing custom subdomains. Users can set their subdomain and see deployment status.

## Files to Create/Update

```
app/(logged-in)/projects/[id]/components/settings/domain-management.tsx
app/(logged-in)/projects/[id]/components/settings/settings-tab.tsx (update)
app/api/projects/[id]/domain/route.ts
```

## Implementation Details

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
