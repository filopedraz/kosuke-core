# 📋 Ticket 19: Project Settings Tab - Environment Variables

**Priority:** High  
**Estimated Effort:** 5 hours

## Description

Create a new "Settings" tab in the project detail view for managing environment variables and integrations like Clerk, Polar, and custom variables.

## Files to Create/Update

```
app/(logged-in)/projects/[id]/components/settings/
├── settings-tab.tsx
├── environment-variables.tsx
├── integrations-panel.tsx
├── variable-form.tsx
├── integration-form.tsx
└── skeletons/
    ├── environment-variables-skeleton.tsx
    └── integrations-skeleton.tsx
app/(logged-in)/projects/[id]/page.tsx (add settings tab)
app/api/projects/[id]/environment/route.ts
app/api/projects/[id]/integrations/route.ts
hooks/use-environment-variables.ts
hooks/use-environment-mutations.ts
hooks/use-integrations.ts
lib/types/environment.ts (centralized environment types)
```

## Implementation Details

**lib/types/environment.ts** - Centralized environment types:

```typescript
export interface EnvironmentVariable {
  id: number;
  key: string;
  value: string;
  is_secret: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEnvironmentVariableData {
  key: string;
  value: string;
  is_secret: boolean;
  description?: string;
}

export interface UpdateEnvironmentVariableData {
  value?: string;
  is_secret?: boolean;
  description?: string;
}

export interface ProjectIntegration {
  id: number;
  integration_type: 'clerk' | 'polar' | 'stripe' | 'custom';
  integration_name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationTemplate {
  type: string;
  name: string;
  description: string;
  required_vars: {
    key: string;
    description: string;
    is_secret: boolean;
  }[];
}
```

**hooks/use-environment-variables.ts** - TanStack Query hook for environment variables:

```typescript
import { useQuery } from '@tanstack/react-query';
import type { EnvironmentVariable } from '@/lib/types/environment';
import type { ApiResponse } from '@/lib/api';

export function useEnvironmentVariables(projectId: number) {
  return useQuery({
    queryKey: ['environment-variables', projectId],
    queryFn: async (): Promise<EnvironmentVariable[]> => {
      const response = await fetch(`/api/projects/${projectId}/environment`);
      if (!response.ok) {
        throw new Error('Failed to fetch environment variables');
      }
      const data: ApiResponse<{ variables: EnvironmentVariable[] }> = await response.json();
      return data.data.variables;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
```

**hooks/use-environment-mutations.ts** - TanStack Query mutations for environment variables:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  CreateEnvironmentVariableData,
  UpdateEnvironmentVariableData,
  EnvironmentVariable,
} from '@/lib/types/environment';
import type { ApiResponse } from '@/lib/api';

export function useCreateEnvironmentVariable(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEnvironmentVariableData): Promise<EnvironmentVariable> => {
      const response = await fetch(`/api/projects/${projectId}/environment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create environment variable');
      }

      const result: ApiResponse<EnvironmentVariable> = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-variables', projectId] });
      toast({
        title: 'Environment Variable Created',
        description: 'The environment variable has been created successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Create Variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEnvironmentVariable(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateEnvironmentVariableData;
    }): Promise<EnvironmentVariable> => {
      const response = await fetch(`/api/projects/${projectId}/environment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update environment variable');
      }

      const result: ApiResponse<EnvironmentVariable> = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-variables', projectId] });
      toast({
        title: 'Environment Variable Updated',
        description: 'The environment variable has been updated successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Update Variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEnvironmentVariable(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/projects/${projectId}/environment/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete environment variable');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-variables', projectId] });
      toast({
        title: 'Environment Variable Deleted',
        description: 'The environment variable has been deleted successfully.',
      });
    },
    onError: error => {
      toast({
        title: 'Failed to Delete Variable',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

**app/(logged-in)/projects/[id]/components/settings/skeletons/environment-variables-skeleton.tsx** - Skeleton component:

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function EnvironmentVariablesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/settings/settings-tab.tsx** - Main settings interface:

```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Key, Plug, Database } from 'lucide-react';
import { EnvironmentVariables } from './environment-variables';
import { IntegrationsPanel } from './integrations-panel';

interface SettingsTabProps {
  projectId: number;
}

export function SettingsTab({ projectId }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Project Settings
          </CardTitle>
          <CardDescription>
            Configure environment variables, integrations, and project settings
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="environment" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="environment" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Environment Variables
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environment" className="mt-6">
          <EnvironmentVariables projectId={projectId} />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsPanel projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/settings/environment-variables.tsx** - Environment variables management:

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Eye, EyeOff, Edit, Trash2, Shield } from 'lucide-react';
import { VariableForm } from './variable-form';
import { EnvironmentVariablesSkeleton } from './skeletons/environment-variables-skeleton';
import {
  useEnvironmentVariables,
  useDeleteEnvironmentVariable,
} from '@/hooks/use-environment-mutations';
import type { EnvironmentVariable } from '@/lib/types/environment';

interface EnvironmentVariablesProps {
  projectId: number;
}

export function EnvironmentVariables({ projectId }: EnvironmentVariablesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVariable, setEditingVariable] = useState<EnvironmentVariable | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<number>>(new Set());

  const { data: variables = [], isLoading, error } = useEnvironmentVariables(projectId);
  const deleteVariableMutation = useDeleteEnvironmentVariable(projectId);

  const handleDeleteVariable = useCallback(
    (id: number) => {
      deleteVariableMutation.mutate(id);
    },
    [deleteVariableMutation]
  );

  const toggleSecretVisibility = useCallback((id: number) => {
    setVisibleSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const formatValue = useCallback(
    (variable: EnvironmentVariable) => {
      if (!variable.is_secret) {
        return variable.value;
      }

      if (visibleSecrets.has(variable.id)) {
        return variable.value;
      }

      return '•'.repeat(Math.min(variable.value.length, 20));
    },
    [visibleSecrets]
  );

  if (isLoading) {
    return <EnvironmentVariablesSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Failed to load environment variables. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Environment Variables</h3>
          <p className="text-sm text-muted-foreground">
            Configure variables that will be available in your project preview
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Variable
        </Button>
      </div>

      {variables.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No environment variables configured. Add your first variable to get started.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {variables.map(variable => (
            <Card key={variable.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-mono text-sm bg-gray-800 px-2 py-1 rounded">
                        {variable.key}
                      </code>
                      {variable.is_secret && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Secret
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-muted-foreground">
                        {formatValue(variable)}
                      </code>
                      {variable.is_secret && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSecretVisibility(variable.id)}
                        >
                          {visibleSecrets.has(variable.id) ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                    {variable.description && (
                      <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingVariable(variable)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteVariable(variable.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VariableForm
        projectId={projectId}
        isOpen={showAddForm || !!editingVariable}
        onClose={() => {
          setShowAddForm(false);
          setEditingVariable(null);
        }}
        onSuccess={() => {
          fetchVariables();
          setShowAddForm(false);
          setEditingVariable(null);
        }}
        editingVariable={editingVariable}
      />

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Secret variables are encrypted and will only be visible in preview containers. Regular
          variables are stored as plain text.
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

**app/api/projects/[id]/environment/route.ts** - Environment variables API:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectEnvironmentVariables } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);

    const variables = await db
      .select()
      .from(projectEnvironmentVariables)
      .where(eq(projectEnvironmentVariables.projectId, projectId));

    return NextResponse.json({ variables });
  } catch (error) {
    console.error('Error fetching environment variables:', error);
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
    const body = await request.json();

    const newVariable = await db
      .insert(projectEnvironmentVariables)
      .values({
        projectId,
        key: body.key,
        value: body.value,
        isSecret: body.is_secret || false,
        description: body.description,
      })
      .returning();

    return NextResponse.json({ variable: newVariable[0] });
  } catch (error) {
    console.error('Error creating environment variable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Acceptance Criteria

- [x] Settings tab added to project detail view
- [x] Environment variables management UI
- [x] Support for secret and regular variables
- [x] CRUD operations for environment variables
- [x] Visual indicators for secret variables
- [x] Description field for documentation
