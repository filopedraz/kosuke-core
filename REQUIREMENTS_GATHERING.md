# Requirements Gathering Feature

## Overview

The Requirements Gathering feature is a mandatory first step in the project creation flow. When a new project is created, users must complete a requirements gathering conversation with Claude before accessing the full platform features.

## Architecture

### Database Schema

**Projects Table**

- Added `status` column: `'requirements' | 'active'`
- Default status is `'requirements'` for all new projects

**Chat Sessions Table**

- Added `isRequirementsSession` boolean flag
- Requirements sessions are filtered from normal session lists
- One requirements session per project, tied to `main` branch

### Flow Diagram

```
Project Creation
    ↓
Create Project (status: 'requirements')
    ↓
Create Requirements Session (isRequirementsSession: true, sessionId: 'main')
    ↓
Add Welcome Message
    ↓
User Chats with Claude
    ↓
Claude Creates/Updates docs.md
    ↓
User Reviews docs.md
    ↓
User Clicks "Complete Requirements"
    ↓
Project Status → 'active'
Requirements Session → Archived
    ↓
Normal Platform Features Enabled
```

## API Endpoints

### GET /api/projects/[id]/requirements/session

Returns the requirements gathering session for a project.

**Response:**

```json
{
  "session": {
    "id": 123,
    "projectId": 1,
    "title": "Requirements Gathering",
    "sessionId": "main",
    "isRequirementsSession": true,
    ...
  }
}
```

### GET /api/projects/[id]/requirements/docs

Polls for docs.md content from the main branch.

**Response:**

```json
{
  "content": "# Product Overview\n...",
  "exists": true,
  "lastUpdated": "2025-10-22T10:30:00Z"
}
```

### POST /api/projects/[id]/requirements/complete

Completes requirements gathering and transitions project to active status.

**Response:**

```json
{
  "success": true,
  "message": "Requirements completed successfully",
  "project": { ... }
}
```

## Frontend Components

### RequirementsDocsPreview

- Located at `src/app/(logged-in)/projects/[id]/components/requirements/docs-preview.tsx`
- Polls for docs.md every 3 seconds
- Shows skeleton while waiting for document
- Renders markdown when available
- Provides "Complete Requirements" button with confirmation dialog

### Modified ProjectPage

- Detects `project.status === 'requirements'`
- Renders special requirements mode UI:
  - Left: Chat interface (no sidebar)
  - Right: Live docs.md preview
- Hides all normal mode features until completion

### Modified Navbar

- Added `isRequirementsMode` prop
- Locks all tabs (Code, Branding, Settings, Database) in requirements mode
- Shows Lock icons and tooltips on disabled tabs
- Renames "Preview" tab to "Requirements" in requirements mode
- Hides Pull Request button and chat toggle controls

## Custom Hooks

### useRequirementsSession(projectId, enabled)

Fetches the requirements session for a project.

### useRequirementsDocs(projectId, enabled)

Polls for docs.md updates every 3 seconds.

### useCompleteRequirements(projectId)

Mutation to complete requirements and transition to active status.

## User Experience

### Initial State

1. User creates a new project
2. Sees chat interface on left with welcome message
3. Right panel shows "Waiting for Requirements Document" skeleton
4. All tabs except "Requirements" are locked with Lock icons

### Requirements Gathering

1. User describes what they want to build
2. Claude analyzes, lists functionalities, creates plan, asks questions
3. User answers questions to refine requirements
4. Claude creates `docs.md` in the repository
5. Right panel automatically updates to show docs.md content

### Completion

1. "Complete Requirements" button appears when docs.md exists
2. User clicks button, sees confirmation dialog
3. On confirmation:
   - Project status → 'active'
   - Requirements session → archived
   - All tabs unlock
   - UI switches to normal mode
   - User can create regular chat sessions

## Key Implementation Details

### Session Management

- Requirements session uses `sessionId = 'main'`
- Never appears in normal chat sessions list
- Automatically created during project creation
- Archived (not deleted) when requirements complete

### Chat Integration

- Uses existing chat infrastructure
- No special backend logic needed
- Claude Agent SDK handles requirements conversation naturally
- docs.md created via standard file write tools

### Feature Gating

- All tabs disabled except "Requirements" tab
- Visual indicators (Lock icons, opacity, tooltips)
- No sidebar or session switching in requirements mode
- Chat cannot be collapsed

### State Transitions

- Only transition: `requirements` → `active`
- No way to go back to requirements mode
- Irreversible once completed
- Requirements session preserved in archived state

## Testing Checklist

- [ ] Create new project - requirements session created
- [ ] Initial welcome message appears
- [ ] Chat with Claude about requirements
- [ ] docs.md appears in right panel
- [ ] docs.md updates in real-time
- [ ] All tabs locked except Requirements
- [ ] Lock icons and tooltips visible
- [ ] Complete Requirements button works
- [ ] Confirmation dialog appears
- [ ] Project transitions to active status
- [ ] All tabs unlock
- [ ] Requirements session hidden from list
- [ ] Can create new chat sessions
- [ ] docs.md persists in repository

## Migration Notes

- Database migration adds two new columns
- All existing projects would have `status = NULL`, need manual update to 'active'
- Fresh database start recommended (per requirements)
- No backwards compatibility needed

## Future Enhancements

- AI-powered requirements validation
- Requirements templates for common project types
- Export requirements as PDF
- Share requirements with team members
- Requirements versioning/history
