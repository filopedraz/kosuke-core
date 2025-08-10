# 006 — Chat Session Messages (Read-only)

## Scope

Display messages for a chosen chat session in chronological order. Read-only with manual refresh.

## Endpoint

- GET `${API_BASE_URL}/projects/:projectId/chat-sessions/:sessionId/messages` (confirm exact path in repo)

## Data

Expected fields: `id`, `role` (user/assistant/system), `content`, `createdAt`.

## Acceptance Criteria

- Messages render in a chat layout (bubbles) with role-based styling
- List scrolls to bottom on load
- Pull-to-refresh fetches latest messages (top or bottom as appropriate)
- Error state shows retry
- No input box (read-only)

## Implementation Checklist

- [ ] Create `useSessionMessagesQuery(projectId, sessionId)`
- [ ] Build `SessionMessagesScreen`
- [ ] Message bubble component with role-based styles
- [ ] Pull-to-refresh and scroll behavior
