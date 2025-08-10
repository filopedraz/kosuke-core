# 003 — Navigation Structure (Expo Router)

## Scope

Define the navigation: Auth flow → Tabs (Projects, Settings) → Project Sessions → Session Messages. Use Expo Router file-based routes with nested stacks.

## Structure

- `app/(auth)/sign-in.tsx`
- `app/(tabs)/_layout.tsx` with tabs: `projects.tsx`, `settings.tsx`
- `app/(tabs)/projects/index.tsx` (list projects)
- `app/(tabs)/projects/[projectId]/index.tsx` (list chat sessions)
- `app/(tabs)/projects/[projectId]/[sessionId].tsx` (messages)

## Acceptance Criteria

- Unauthenticated users are redirected to `/(auth)/sign-in`
- Tabs visible only when authenticated
- Header titles reflect current screen
- Deep links open the correct screen

## Implementation Checklist

- [ ] Ensure `expo-router` is configured (present in repo)
- [ ] Implement auth guard in root layout
- [ ] Define tabs and stack segments as above
- [ ] Add screen options for titles and theming
