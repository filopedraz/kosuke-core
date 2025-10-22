# Requirements Gathering - Testing Guide

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Ensure ANTHROPIC_API_KEY is set
echo $ANTHROPIC_API_KEY

# Start PostgreSQL
docker compose up -d

# Start Next.js (Frontend)
npm run dev

# Python agent will be initialized AFTER requirements complete
```

### 2. Create New Project

1. Navigate to http://localhost:3000/projects
2. Click "Create Project"
3. Enter project details and submit

### 3. Expected Behavior

**Immediate Results:**

- ✅ Redirected to project page
- ✅ Chat interface on left (25% width)
- ✅ "Waiting for docs.md" on right (75% width)
- ✅ All tabs locked: 🔒 Code, 🔒 Branding, 🔒 Settings, 🔒 Database
- ✅ "Requirements" tab active (not "Preview")
- ✅ Welcome message in chat
- ✅ No sidebar toggle button
- ✅ No chat collapse button
- ✅ No "Create PR" button

## 📝 Test Scenarios

### Scenario 1: First Message (Planning Mode)

**Action:**

```
Type in chat: "Build a task management app with priorities and due dates"
Send message
```

**Expected Claude Response:**

```markdown
## Product Analysis

A comprehensive task management application...

## Core Functionalities

- User authentication and account management
- Task creation with title, description, priority levels
- Due date assignment and tracking
  ...

## Implementation Plan

...

## Clarification Questions

1. Should users be able to collaborate and share tasks?
2. Do you want email reminders for upcoming due dates?
3. What priority levels do you need (e.g., Low, Medium, High, Urgent)?
```

**Verification:**

- ✅ Response streams in real-time (SSE)
- ✅ Content blocks appear as Claude writes
- ✅ Tool usage shows (if any file operations)
- ✅ Right panel still shows "Waiting for docs.md"
- ✅ No errors in console

### Scenario 2: Answer Questions

**Action:**

```
Type: "1. No, single user for now 2. Yes, email reminders please 3. Low, Medium, High is fine"
Send message
```

**Expected Claude Response:**

```markdown
Thank you for the clarifications! I'll now create a comprehensive requirements document...

[Claude creates docs.md file]
```

**Verification:**

- ✅ Response streams normally
- ✅ Tool block appears: "Writing: docs.md"
- ✅ Right panel updates within ~3 seconds
- ✅ Markdown content rendered properly
- ✅ Document includes all sections
- ✅ "Complete Requirements" button appears
- ✅ Check filesystem: `ls projects/4/docs.md` exists

### Scenario 3: Refine Requirements

**Action:**

```
Type: "Add a calendar view to see all tasks by date"
Send message
```

**Expected:**

- ✅ Claude updates docs.md
- ✅ Tool block: "Editing: docs.md"
- ✅ Right panel refreshes with updated content
- ✅ Calendar view mentioned in functionalities
- ✅ Local file updated: `cat projects/4/docs.md`

### Scenario 4: Complete Requirements

**Action:**

```
Click "Complete Requirements" button
Confirm in dialog
```

**Expected Workflow:**

1. ✅ Button shows "Completing..." loading state
2. ✅ docs.md committed to GitHub main branch
3. ✅ Project status updated to 'active'
4. ✅ Requirements session archived
5. ✅ Python agent environment initializes
6. ✅ Local workspace cleaned up (`projects/4/` deleted)
7. ✅ Success toast appears
8. ✅ Page re-renders in normal mode
9. ✅ All tabs unlocked
10. ✅ Preview panel replaces requirements view
11. ✅ Can create new chat sessions

### Scenario 5: Verify GitHub Commit

**Action:**

```
Go to GitHub repository
Check main branch
Look for docs.md
```

**Expected:**

- ✅ docs.md exists at repository root
- ✅ Commit message: "Add requirements document (docs.md)"
- ✅ Content matches what was in preview
- ✅ File is on main branch

### Scenario 6: Post-Completion Chat

**Action:**

```
Click "New Chat" in sessions sidebar
Create session: "Feature Development"
Send message: "Implement user authentication"
```

**Expected:**

- ✅ New branch created (kosuke-chat-xxxxx)
- ✅ Python agent handles message
- ✅ Normal vibe-coding workflow
- ✅ Requirements session NOT in sessions list
- ✅ docs.md available in code explorer

## 🔍 Debugging

### Check Local Workspace

```bash
# See if docs.md was created
ls -la projects/4/

# Read docs.md content
cat projects/4/docs.md

# Check all workspaces
ls -la projects/
```

### Check Database

```bash
# Connect to PostgreSQL
npm run db:studio

# Check project status
SELECT id, name, status FROM projects;

# Check requirements session
SELECT id, title, session_id, is_requirements_session
FROM chat_sessions
WHERE is_requirements_session = true;

# Check messages
SELECT id, role, content, blocks
FROM chat_messages
WHERE chat_session_id = (
  SELECT id FROM chat_sessions WHERE is_requirements_session = true LIMIT 1
);
```

### Check API Endpoints

```bash
# Test requirements chat (manual curl)
curl -X POST http://localhost:3000/api/projects/4/requirements/chat \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message"}' \
  --no-buffer

# Test docs endpoint
curl http://localhost:3000/api/projects/4/requirements/docs

# Test session endpoint
curl http://localhost:3000/api/projects/4/requirements/session
```

### Common Issues

**Error: "ANTHROPIC_API_KEY environment variable not set"**

- Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
- Restart Next.js server

**Error: "Session environment not found"**

- This is expected during requirements mode
- Python agent not initialized yet
- Will work after requirements complete

**Error: "duplicate key value violates unique constraint"**

- Session with same sessionId already exists
- Delete old session from database
- Or delete entire database and restart fresh

**Error: "No response body" in SSE**

- Check requirements chat endpoint returns proper SSE headers
- Verify Content-Type is 'text/event-stream'
- Check browser network tab for streaming data

## 📊 Success Indicators

### Requirements Mode Working:

- ✅ Welcome message appears automatically
- ✅ Can send messages and get responses
- ✅ SSE streaming works (real-time updates)
- ✅ docs.md appears in right panel
- ✅ Tabs are locked with tooltips
- ✅ No Python agent errors

### Completion Working:

- ✅ docs.md committed to GitHub
- ✅ Project transitions to active
- ✅ All features unlock
- ✅ Python agent initializes
- ✅ Workspace cleaned up
- ✅ Normal chat sessions work

### Integration Working:

- ✅ Requirements session hidden from list
- ✅ Can't access it after completion
- ✅ docs.md in repository
- ✅ Smooth transition to normal mode
- ✅ No breaking changes to existing features

## 🎯 Ready to Test!

Create a project and watch the magic happen! 🚀
