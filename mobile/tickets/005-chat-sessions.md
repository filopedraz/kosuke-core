# 005 — Project Chat Sessions (Read-only)

## Scope

Given a project, display its chat sessions. Read-only list with pull-to-refresh and skeletons.

## Endpoint

- GET `${API_BASE_URL}/projects/:projectId/chat-sessions`

## Data

Expected fields: `id`, `title`, `updatedAt` (or similar).

## Acceptance Criteria

- Navigating from a project shows sessions list
- Skeleton on initial load
- Pull-to-refresh refetches
- Error state shows retry
- Tapping a session navigates to messages

## Implementation Checklist

- [ ] Create `useProjectSessionsQuery(projectId)`
- [ ] Build `ProjectSessionsScreen`
- [ ] Skeleton placeholder
- [ ] Pull-to-refresh
