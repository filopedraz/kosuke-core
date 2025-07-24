# 📐 Cursor Rules Compliance Updates for Frontend Tickets

This document outlines the specific updates needed to make all frontend tickets compliant with cursor rules.

## ✅ Already Updated Tickets

- **Ticket 14**: GitHub Branch Management & Pull Request UI - ✅ **COMPLETED**
- **Ticket 19**: Project Settings Tab - Environment Variables - ✅ **COMPLETED**
- **Ticket 17**: Database Management Tab - ✅ **File structure updated**

## 🔄 Remaining Frontend Tickets Requiring Updates

### Ticket 13: Next.js GitHub Integration Routes

**Status**: ❌ **Needs cursor rule compliance**

**Required Changes**:

- Add centralized types in `lib/types/github.ts`
- Create TanStack Query hooks in `hooks/`
- Add skeleton components for loading states
- Replace manual fetch with TanStack Query
- Add proper error handling with toasts

**New Files Needed**:

```
hooks/use-github-repositories.ts
hooks/use-github-branches.ts
hooks/use-github-commits.ts
components/github/skeletons/repository-list-skeleton.tsx
components/github/skeletons/branch-list-skeleton.tsx
lib/types/github.ts (extend existing)
```

**Key Implementation Updates**:

```typescript
// Replace manual fetch patterns with:
export function useGitHubRepositories(userId: string) {
  return useQuery({
    queryKey: ['github-repositories', userId],
    queryFn: async () => fetchUserRepositories(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
```

### Ticket 15: Replace Authentication with Clerk

**Status**: ❌ **Needs cursor rule compliance**

**Required Changes**:

- Add skeleton components for auth loading states
- Create TanStack Query hooks for user data
- Centralize auth types
- Add proper error handling for auth failures

**New Files Needed**:

```
hooks/use-clerk-user.ts
hooks/use-auth-status.ts
components/auth/skeletons/login-form-skeleton.tsx
components/auth/skeletons/user-profile-skeleton.tsx
lib/types/auth.ts
```

### Ticket 16: Checkpoint Revert System

**Status**: ❌ **Needs cursor rule compliance**

**Required Changes**:

- Add centralized checkpoint types
- Create TanStack Query hooks for checkpoint operations
- Add skeleton components for checkpoint lists
- Replace manual state management with TanStack Query
- Add proper error handling and optimistic updates

**New Files Needed**:

```
hooks/use-checkpoints.ts
hooks/use-checkpoint-operations.ts
components/checkpoints/skeletons/checkpoint-list-skeleton.tsx
components/checkpoints/skeletons/checkpoint-card-skeleton.tsx
lib/types/checkpoints.ts
```

**Key Implementation Updates**:

```typescript
export function useCheckpoints(projectId: number) {
  return useQuery({
    queryKey: ['checkpoints', projectId],
    queryFn: async () => fetchProjectCheckpoints(projectId),
    staleTime: 1000 * 30, // 30 seconds (frequently updated)
    retry: 2,
  });
}

export function useRevertToCheckpoint(projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkpointId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/checkpoints/${checkpointId}/revert`,
        {
          method: 'POST',
        }
      );
      if (!response.ok) throw new Error('Failed to revert to checkpoint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast({
        title: 'Checkpoint Restored',
        description: 'Successfully reverted to the selected checkpoint.',
      });
    },
    onError: error => {
      toast({
        title: 'Revert Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

### Ticket 23: Custom Domain Management UI

**Status**: ❌ **Needs cursor rule compliance**

**Required Changes**:

- Add centralized domain types
- Create TanStack Query hooks for domain operations
- Add skeleton components for domain lists
- Replace manual state management with TanStack Query
- Add proper error handling for domain validation

**New Files Needed**:

```
hooks/use-custom-domains.ts
hooks/use-domain-operations.ts
components/domains/skeletons/domain-list-skeleton.tsx
components/domains/skeletons/domain-form-skeleton.tsx
lib/types/domains.ts
```

## 🎯 Common Patterns for All Updates

### 1. **TanStack Query Hook Pattern**

```typescript
// Standard query hook pattern
export function use[Feature][Entity](projectId: number, options?: QueryOptions) {
  return useQuery({
    queryKey: ['feature-entity', projectId],
    queryFn: async () => fetch[Feature][Entity](projectId),
    staleTime: 1000 * 60 * 2, // 2 minutes default
    retry: 2,
    ...options,
  });
}

// Standard mutation hook pattern
export function use[Action][Entity](projectId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: [ActionData]) => {
      const response = await fetch(`/api/projects/${projectId}/endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Operation failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['related-data', projectId] });
      toast({
        title: 'Success',
        description: 'Operation completed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Operation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

### 2. **Skeleton Component Pattern**

```tsx
// Standard skeleton component pattern
export function [Component]Skeleton() {
  return (
    <div className="space-y-4">
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
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
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

### 3. **Component Pattern with Hooks**

```tsx
// Standard component pattern with cursor rule compliance
export function [Component]({ projectId }: { projectId: number }) {
  const { data: items = [], isLoading, error } = use[Feature](projectId);
  const [actionMutation] = use[Action](projectId);

  const handleAction = useCallback((id: string) => {
    actionMutation.mutate(id);
  }, [actionMutation]);

  if (isLoading) {
    return <[Component]Skeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Failed to load data. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Component content */}
    </div>
  );
}
```

### 4. **Centralized Types Pattern**

```typescript
// lib/types/[feature].ts
export interface [Entity] {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Create[Entity]Data {
  name: string;
  config?: Record<string, unknown>;
}

export interface Update[Entity]Data {
  name?: string;
  status?: 'active' | 'inactive';
  config?: Record<string, unknown>;
}

export interface [Entity]FilterOptions {
  status?: 'active' | 'inactive';
  search?: string;
  page?: number;
  limit?: number;
}
```

## 🚀 Implementation Priority

1. **High Priority** (blocking other features):

   - Ticket 15: Replace Authentication with Clerk
   - Ticket 16: Checkpoint Revert System

2. **Medium Priority** (user-facing features):
   - Ticket 13: Next.js GitHub Integration Routes
   - Ticket 23: Custom Domain Management UI

## 📋 Checklist for Each Update

For each ticket update:

- [ ] **Move all interfaces** from components to `lib/types/[feature].ts`
- [ ] **Create TanStack Query hooks** in `hooks/use-[feature].ts`
- [ ] **Create skeleton components** in `components/[feature]/skeletons/`
- [ ] **Replace manual fetch** with TanStack Query hooks
- [ ] **Add proper error handling** with toast notifications
- [ ] **Use useCallback** for event handlers
- [ ] **Add loading states** with skeleton components
- [ ] **Update file structure** in ticket documentation
- [ ] **Add acceptance criteria** for cursor rule compliance

## 🎯 Expected Outcomes

After implementing these updates:

✅ **Consistent Data Fetching** - All API calls use TanStack Query  
✅ **Professional Loading States** - Skeleton components everywhere  
✅ **Centralized Type Management** - Clean, reusable type definitions  
✅ **Robust Error Handling** - User-friendly error messages  
✅ **Optimized Performance** - Proper React hook usage  
✅ **Maintainable Codebase** - Consistent patterns across all components

This ensures the entire frontend follows cursor rules and maintains high code quality standards.
