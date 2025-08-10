# 009 — API Client and Data Fetching (TanStack Query)

## Scope

Configure a centralized API client and TanStack Query provider. Build typed hooks for Projects, Sessions, and Messages.

## Tech Decisions

- `@tanstack/react-query`
- Simple `fetch` wrapper using `API_BASE_URL` from app config
- Optional: add request/response logging in dev

## Acceptance Criteria

- QueryClientProvider wraps the app
- Hooks return typed data and loading/error states
- Global retry: 1; reasonable staleTime for lists
- Manual refetch supported for pull-to-refresh

## Implementation Checklist

- [ ] Add dep: `@tanstack/react-query`
- [ ] Create `mobile/lib/api.ts` with `apiFetch(path, options)`
- [ ] Provide `QueryClientProvider` in root
- [ ] Implement hooks: `useProjectsQuery`, `useProjectSessionsQuery`, `useSessionMessagesQuery`
- [ ] Add error normalization util and basic toasts/snackbars
