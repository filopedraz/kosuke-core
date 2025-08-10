# 004 — Projects List (Read-only)

## Scope

Fetch and display the user’s projects from the web API. Read-only list with pull-to-refresh and skeletons.

## Endpoint

- GET `${API_BASE_URL}/projects`

## Data

Align with web type definitions in `lib/types`. Expected fields: `id`, `name`, `updatedAt` (or similar).

## Acceptance Criteria

- Initial load shows skeleton
- List shows project name and last activity
- Pull-to-refresh refetches
- Tapping a project navigates to its sessions screen
- Error state shows retry action

## Implementation Checklist

- [ ] Add TanStack Query provider in root (see 009)
- [ ] Create `useProjectsQuery()` hook using `@tanstack/react-query`
- [ ] Build `ProjectsList` screen with NativeWind styling
- [ ] Implement skeleton placeholder
- [ ] Implement pull-to-refresh
