# 🎯 Kosuke Agent Enhancement & GitHub Integration Tickets

This directory contains individual ticket files for the Kosuke agent enhancement and GitHub integration project.

## 📋 Tickets Overview

### Phase 1: Infrastructure & Preview Migration (Tickets 1-7)

- [01: Rename Agent Endpoints to Routes](01-rename-agent-endpoints-to-routes.md) - ⚡ Low priority, 0.5h
- [02: Setup Python Testing Infrastructure](02-setup-python-testing-infrastructure.md) - 🔴 High priority, 2h
- [03: Setup Pre-commit Hooks & Code Quality](03-setup-pre-commit-hooks-code-quality.md) - 🔴 High priority, 1.5h
- [3.5: Comprehensive Agent Implementation Test Cases](3.5-comprehensive-agent-implementation-test-cases.md) - 🔴 High priority, 4h
- [04: Setup Python Docker Integration](04-setup-python-docker-integration.md) - 🔥 Critical, 4h
- [05: Add Preview API Routes to Agent](05-add-preview-api-routes-to-agent.md) - 🔥 Critical, 3h
- [06: Update Next.js to Proxy Preview Requests](06-update-nextjs-to-proxy-preview-requests.md) - 🔴 High priority, 2h
- [07: Remove Old Preview Logic from Next.js](07-remove-old-preview-logic-from-nextjs.md) - 🟡 Medium priority, 1h

### Phase 2: GitHub Integration (Tickets 8-13)

- [08: Database Schema for GitHub Integration](08-database-schema-for-github-integration.md) - 🔴 High priority, 1h
- [09: GitHub OAuth Integration with Clerk](09-github-oauth-integration-with-clerk.md) - 🔴 High priority, 1.5h
- [10: GitHub Service in Python Agent](10-github-service-in-python-agent.md) - 🔥 Critical, 6h
- [11: GitHub API Routes in Agent](11-github-api-routes-in-agent.md) - 🔴 High priority, 4h
- [12: Integrate GitHub Auto-Commit in Agent Workflow](12-integrate-github-auto-commit-in-agent-workflow.md) - 🔴 High priority, 4h
- [13: Next.js GitHub Integration Routes](13-nextjs-github-integration-routes.md) - 🔴 High priority, 3h

### Phase 3: Enhanced UI & Modern Auth (Tickets 14-15)

- [14: GitHub Branch Management & Pull Request UI](14-github-branch-management-pull-request-ui.md) - 🔴 High priority, 5h
- [15: Replace Authentication with Clerk](15-replace-authentication-with-clerk.md) - 🔴 High priority, 6h

### Phase 4: Advanced Features (Tickets 16-20)

- [16: Checkpoint Revert System](16-checkpoint-revert-system.md) - 🔴 High priority, 6h
- [17: Database Management Tab](17-database-management-tab.md) - 🔴 High priority, 4h
- [18: Database Schema for Environment Variables](18-database-schema-for-environment-variables.md) - 🔴 High priority, 1h
- [19: Project Settings Tab - Environment Variables](19-project-settings-tab---environment-variables.md) - 🔴 High priority, 3h
- [20: Integrate Environment Variables with Preview System](20-integrate-environment-variables-with-preview-system.md) - 🔴 High priority, 2h

### Phase 5: Production Subdomain Routing (Tickets 21-23)

- [21: Database Schema for Custom Domains](21-database-schema-for-custom-domains.md) - 🔴 High priority, 2h
- [22: Traefik Reverse Proxy Integration](22-traefik-reverse-proxy-integration.md) - 🔴 High priority, 4h
- [23: Custom Domain Management UI](23-custom-domain-management-ui.md) - 🔴 High priority, 3h

## 🎯 Total Estimated Effort

**~62.5 hours** across 24 tickets

## 📐 Cursor Rules Compliance

All frontend tickets **MUST** follow these cursor rules to ensure consistent, high-quality code:

### 🔄 **TanStack Query for Data Fetching**

- **NEVER** use manual `useEffect` + `fetch` patterns
- **ALWAYS** use TanStack Query hooks for API calls
- **IMPLEMENT** proper caching, retry logic, and stale time
- **CREATE** dedicated hooks in `hooks/` directory

```typescript
// ✅ CORRECT - TanStack Query
export function useGitHubStatus(projectId: number) {
  return useQuery({
    queryKey: ['github-status', projectId],
    queryFn: async () => fetchGitHubStatus(projectId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
}

// ❌ WRONG - Manual fetch
const [data, setData] = useState(null);
useEffect(() => {
  fetch('/api/...').then(setData);
}, []);
```

### 🦴 **Skeleton Components for Loading States**

- **NEVER** use simple "Loading..." text
- **ALWAYS** create dedicated skeleton components
- **PLACE** skeletons in `components/*/skeletons/` directories
- **MATCH** the exact layout structure being loaded

```tsx
// ✅ CORRECT - Skeleton component
if (isLoading) {
  return <EnvironmentVariablesSkeleton />;
}

// ❌ WRONG - Simple loading text
if (loading) {
  return <div>Loading...</div>;
}
```

### 📦 **Centralized Type Organization**

- **NEVER** define interfaces inside components or hooks
- **ALWAYS** place types in `lib/types/` directory
- **ORGANIZE** by feature domain (github.ts, environment.ts, database.ts)
- **EXPORT** all interfaces for reuse

```typescript
// ✅ CORRECT - lib/types/github.ts
export interface BranchStatus {
  current_branch: string;
  has_uncommitted_changes: boolean;
  // ...
}

// ❌ WRONG - Inside component
function Component() {
  interface BranchStatus {
    /* ... */
  }
  // ...
}
```

### 🚨 **Error Handling with Toast Notifications**

- **NEVER** use `console.error` for user-facing errors
- **ALWAYS** use `useToast` for error notifications
- **IMPLEMENT** proper error boundaries
- **PROVIDE** actionable error messages

```typescript
// ✅ CORRECT - Toast notifications
onError: (error) => {
  toast({
    title: 'Failed to Create Variable',
    description: error.message,
    variant: 'destructive',
  });
}

// ❌ WRONG - Console error
.catch(error => console.error('Error:', error));
```

### ⚡ **Performance Optimization**

- **USE** `useCallback` for event handlers
- **USE** `useMemo` for expensive computations
- **IMPLEMENT** proper dependency arrays
- **AVOID** unnecessary re-renders

```typescript
// ✅ CORRECT - Optimized callbacks
const handleDelete = useCallback((id: number) => {
  deleteVariableMutation.mutate(id);
}, [deleteVariableMutation]);

// ❌ WRONG - Inline functions
onClick={() => deleteVariable(id)}
```

### 🗂️ **File Organization**

```
app/(logged-in)/projects/[id]/components/
├── github/
│   ├── branch-indicator.tsx
│   ├── pull-request-modal.tsx
│   └── skeletons/
│       ├── branch-indicator-skeleton.tsx
│       └── pull-request-modal-skeleton.tsx
├── settings/
│   ├── environment-variables.tsx
│   └── skeletons/
│       └── environment-variables-skeleton.tsx
hooks/
├── use-github-status.ts
├── use-environment-variables.ts
└── use-environment-mutations.ts
lib/
├── types/
│   ├── github.ts
│   ├── environment.ts
│   └── database.ts
└── api/
    └── responses.ts
```

## 🏗️ Architecture Benefits

✅ **Ultra-lean Next.js** - pure frontend + auth + API proxy  
✅ **Modern Clerk authentication** - industry standard  
✅ **Complete testing infrastructure** - pytest, ruff, mypy, bandit with pre-commit hooks  
✅ **Complete GitHub workflow** - like Vercel's integration  
✅ **Visual branch management** - see status, create PRs instantly  
✅ **Checkpoint system** - revert to any previous state  
✅ **Database management** - full schema and data visibility  
✅ **Environment variables management** - per-project configuration  
✅ **Correct Docker image** - using kosuke-template:v0.0.73  
✅ **Isolated project databases** - each project gets its own postgres DB  
✅ **Centralized Python agent** - all operations in one service  
✅ **Auto-commit with checkpoints** - intelligent batch commits  
✅ **Clean separation** - frontend, auth, and agent logic isolated

## 📖 How to Use

1. Each ticket is a standalone markdown file with complete implementation details
2. Tickets include priority levels, estimated effort, and acceptance criteria
3. Implementation details include code examples and configuration
4. Test cases are included for tickets with business logic
5. Files are named with number prefix for easy ordering: `XX-descriptive-name.md`
6. **All frontend tickets follow cursor rules for consistency and quality**

## 🔄 Status Tracking

To track progress, you can:

- Check off acceptance criteria within each ticket file
- Use project management tools referencing ticket numbers
- Create git branches using ticket numbers: `ticket/01-rename-endpoints`

## ✅ Quality Assurance

Before implementing any frontend ticket:

1. **Verify** TanStack Query usage for all API calls
2. **Create** skeleton components for loading states
3. **Organize** types in centralized locations
4. **Implement** proper error handling with toasts
5. **Optimize** for performance with React hooks
6. **Test** all error scenarios and edge cases
