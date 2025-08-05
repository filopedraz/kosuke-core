# Ticket #20: Multiple Chat Sessions with Sidebar Interface

## **Overview**

Implement a multi-chat interface that allows users to create and manage multiple conversation sessions within a project. Each chat session will correspond to a unique GitHub branch (`kosuke-chat-{session_id}`) for isolated development workflows.

## **Current State**

- ✅ Single chat session per project
- ✅ Chat messages stored in `chat_messages` table
- ✅ GitHub integration with session-based branching
- ✅ Agent commits to chat-specific branches

## **Target State**

- 🎯 Multiple chat sessions per project
- 🎯 Left sidebar with chat session list
- 🎯 Easy chat session creation and switching
- 🎯 Chat session management (rename, delete, archive)
- 🎯 GitHub branch integration per chat session
- 🎯 **NEW:** Settings tab with default branch configuration
- 🎯 **NEW:** Create Pull Request button in navbar
- 🎯 **NEW:** Branch display in model banner
- 🎯 **NEW:** Isolated file system per chat session

---

## **Database Schema Changes**

### **New Table: `chat_sessions`**

```sql
CREATE TABLE chat_sessions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(clerk_user_id),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  session_id VARCHAR(50) NOT NULL UNIQUE, -- Used for GitHub branch naming
  github_branch_name VARCHAR(100), -- kosuke-chat-{session_id}
  status VARCHAR(20) DEFAULT 'active', -- active, archived, completed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE -- First chat session in project
);

-- Indexes
CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
```

### **Update Table: `chat_messages`**

```sql
-- Add chat_session_id column
ALTER TABLE chat_messages
ADD COLUMN chat_session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);

-- Migrate existing messages to default chat sessions (migration script needed)
```

### **Database Migration Script**

```sql
-- Migration: Create default chat sessions for existing projects
INSERT INTO chat_sessions (project_id, user_id, title, session_id, is_default, message_count)
SELECT
  p.id as project_id,
  p.user_id,
  'Main Conversation' as title,
  CONCAT('session_', p.id, '_', EXTRACT(EPOCH FROM NOW())::INTEGER) as session_id,
  TRUE as is_default,
  COALESCE(msg_count.count, 0) as message_count
FROM projects p
LEFT JOIN (
  SELECT project_id, COUNT(*) as count
  FROM chat_messages
  GROUP BY project_id
) msg_count ON p.id = msg_count.project_id;

-- Update existing chat_messages to reference default chat sessions
UPDATE chat_messages
SET chat_session_id = cs.id
FROM chat_sessions cs
WHERE chat_messages.project_id = cs.project_id
AND cs.is_default = TRUE
AND chat_messages.chat_session_id IS NULL;
```

### **Update Table: `projects`**

```sql
-- Add default branch configuration to projects table
ALTER TABLE projects
ADD COLUMN default_branch VARCHAR(100) DEFAULT 'main';

-- Create index for performance
CREATE INDEX idx_projects_default_branch ON projects(default_branch);
```

---

## **Backend API Endpoints**

### **Chat Session Management**

```typescript
// GET /api/projects/[id]/chat-sessions
// List all chat sessions for a project
interface ChatSessionListResponse {
  sessions: ChatSession[];
  total: number;
}

// POST /api/projects/[id]/chat-sessions
// Create new chat session
interface CreateChatSessionRequest {
  title: string;
  description?: string;
}

// PUT /api/projects/[id]/chat-sessions/[sessionId]
// Update chat session (rename, archive, etc.)
interface UpdateChatSessionRequest {
  title?: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
}

// DELETE /api/projects/[id]/chat-sessions/[sessionId]
// Delete chat session and associated messages

// GET /api/projects/[id]/chat-sessions/[sessionId]/messages
// Get messages for specific chat session
```

### **Updated Chat API**

```typescript
// POST /api/chat
// Send message to specific chat session
interface ChatRequest {
  project_id: number;
  chat_session_id: number; // NEW: Required field
  prompt: string;
  github_token?: string;
}
```

### **NEW: Project Settings API**

```typescript
// GET /api/projects/[id]/settings/default-branch
// Get project default branch setting
interface DefaultBranchResponse {
  default_branch: string;
  available_branches: string[];
}

// PUT /api/projects/[id]/settings/default-branch
// Update project default branch
interface UpdateDefaultBranchRequest {
  default_branch: string;
}

// GET /api/projects/[id]/github/branches
// Get available GitHub branches for project
interface GitHubBranchesResponse {
  branches: GitHubBranch[];
}

interface GitHubBranch {
  name: string;
  commit_sha: string;
  is_default: boolean;
}
```

### **NEW: Pull Request Management API**

```typescript
// POST /api/projects/[id]/chat-sessions/[sessionId]/pull-request
// Create pull request from chat session branch
interface CreatePullRequestRequest {
  title?: string;
  description?: string;
  target_branch?: string; // Defaults to project default_branch
}

interface CreatePullRequestResponse {
  pull_request_url: string;
  pull_request_number: number;
  title: string;
  source_branch: string;
  target_branch: string;
}
```

---

## **Frontend Implementation**

### **New Components**

#### **1. ChatSidebar Component**

```typescript
// components/chat/chat-sidebar.tsx
interface ChatSidebarProps {
  projectId: number;
  activeChatSessionId: number;
  onChatSessionChange: (sessionId: number) => void;
}

// Features:
// - List of chat sessions
// - New chat button
// - Chat session context menu (rename, delete, archive)
// - Search/filter chat sessions
// - Last activity timestamps
// - Message count indicators
```

#### **2. ChatSessionCard Component**

```typescript
// components/chat/chat-session-card.tsx
interface ChatSessionCardProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  onArchive: () => void;
}
```

#### **3. NewChatModal Component**

```typescript
// components/chat/new-chat-modal.tsx
interface NewChatModalProps {
  projectId: number;
  onChatCreated: (session: ChatSession) => void;
}
```

#### **NEW: 4. Settings Components**

```typescript
// components/settings/default-branch-settings.tsx
interface DefaultBranchSettingsProps {
  projectId: number;
}

// Features:
// - Dropdown to select default branch from GitHub repository
// - Display current default branch
// - Save/cancel functionality
// - Loading states while fetching branches
```

#### **NEW: 5. Updated Navbar Component**

```typescript
// components/ui/navbar.tsx - Extended projectProps
interface NavbarProps {
  variant?: 'standard' | 'project' | 'waitlist';
  projectProps?: {
    projectName: string;
    currentView: 'preview' | 'code' | 'branding' | 'settings'; // Added settings
    onViewChange: (view: 'preview' | 'code' | 'branding' | 'settings') => void;
    onRefresh?: () => void;
    isChatCollapsed?: boolean;
    onToggleChat?: () => void;
    // NEW: Pull Request functionality
    activeChatSessionId?: number | null;
    onCreatePullRequest?: () => void;
  };
}

// Features:
// - Add Settings tab button
// - Add Create Pull Request button (left of avatar)
// - Disable PR button when no active chat session
```

#### **NEW: 6. Updated Model Banner Component**

```typescript
// components/chat/model-banner.tsx
interface ModelBannerProps {
  className?: string;
  currentBranch?: string; // NEW: Display current branch
  chatSessionId?: number | null; // NEW: Track active session
}

// Features:
// - Display current branch name on the right side
// - Show "main" when no active chat session
// - Responsive design for branch name display
```

### **Updated Page Layout**

```typescript
// app/(logged-in)/projects/[id]/page.tsx
// Four-column layout with settings:
// [ChatSidebar] [ChatInterface] [ProjectDetails] [Settings]

// Tab-based interface:
// Preview | Code | Branding | Settings

// Responsive behavior:
// Mobile: Stack vertically, collapsible sidebar
// Tablet: Two-column, sidebar overlay
// Desktop: Multi-column flexible layout
```

---

## **State Management**

### **Chat Session State**

```typescript
// hooks/use-chat-sessions.ts
interface ChatSessionState {
  sessions: ChatSession[];
  activeSessionId: number | null;
  isLoading: boolean;
  error: string | null;
}

// Actions:
// - fetchChatSessions()
// - createChatSession()
// - updateChatSession()
// - deleteChatSession()
// - setActiveSession()
```

### **Updated Chat State**

```typescript
// hooks/use-chat.ts
interface ChatState {
  projectId: number;
  chatSessionId: number; // NEW: Required
  messages: ChatMessage[];
  isLoading: boolean;
  // ... existing fields
}
```

---

## **NEW: Container Isolation Architecture**

### **Isolation Overview**

Each chat session operates in its own isolated file system environment with separate directory checkouts. This ensures complete isolation between sessions and prevents conflicts.

### **Directory Structure**

```bash
/projects/{project_id}/
├── main/                           # Main project directory (existing)
│   ├── .git/
│   ├── package.json
│   └── ... (project files)
└── sessions/                       # NEW: Session isolation directory
    ├── session_abc123/             # Chat session 1 environment
    │   ├── .git/                   # Independent git state
    │   ├── package.json
    │   └── ... (branch-specific files)
    ├── session_def456/             # Chat session 2 environment
    │   ├── .git/
    │   ├── package.json
    │   └── ... (branch-specific files)
    └── session_ghi789/             # Chat session 3 environment
        ├── .git/
        ├── package.json
        └── ... (branch-specific files)
```

### **Session Lifecycle Management**

```python
# agent/app/services/session_manager.py
class SessionManager:
    """Manages isolated session environments"""

    def create_session_environment(self, project_id: int, session_id: str, base_branch: str) -> str:
        """
        Create isolated environment for chat session
        1. Create session directory: /projects/{project_id}/sessions/{session_id}/
        2. Clone repository to session directory
        3. Checkout base_branch (from project.default_branch)
        4. Create session branch: kosuke-chat-{session_id}
        5. Return session directory path
        """

    def cleanup_session_environment(self, project_id: int, session_id: str) -> bool:
        """
        Clean up session environment when session ends
        1. Remove session directory
        2. Free up disk space
        3. Update session status to 'cleaned'
        """

    def get_session_path(self, project_id: int, session_id: str) -> str:
        """Get the file system path for a session"""
        return f"/projects/{project_id}/sessions/{session_id}/"
```

### **Agent Service Integration**

```python
# agent/app/core/agent.py - Updated for session isolation
class Agent:
    def __init__(self, project_id: int, session_id: str, assistant_message_id: int | None = None):
        self.project_id = project_id
        self.session_id = session_id
        self.session_manager = SessionManager()

        # Get session-specific working directory
        self.working_directory = self.session_manager.get_session_path(project_id, session_id)

        # Initialize claude-code service with session directory
        self.claude_code_service = ClaudeCodeService(
            project_id=project_id,
            working_directory=self.working_directory
        )
```

### **Updated GitHub Service**

```python
# agent/app/services/github_service.py - Session-aware operations
class GitHubService:
    def create_session_branch(self, session_path: str, session_id: str, base_branch: str) -> str:
        """
        Create branch for chat session in isolated environment
        1. Navigate to session directory
        2. Ensure on base_branch
        3. Create kosuke-chat-{session_id} branch
        4. Return branch name
        """

    def commit_session_changes(self, session_path: str, session_id: str, commit_message: str | None = None) -> GitHubCommit | None:
        """
        Commit changes in session-specific directory
        - All operations happen in session directory
        - No conflicts with other sessions
        - Independent git state
        """
```

---

## **GitHub Integration Updates**

### **Session ID Generation**

```typescript
// Generate unique session IDs for GitHub branch naming
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GitHub branch name: kosuke-chat-{session_id}
// Example: kosuke-chat-session_1704834567_k3m9n2x8q
```

### **Branch Management**

```typescript
// Each chat session creates its own branch
// Agent service automatically handles branch creation/switching
// Frontend passes session_id to agent for proper branch targeting
```

---

## **UI/UX Design Specifications**

### **Left Sidebar Layout**

```text
┌─────────────────┐
│ 📁 Project Name │
├─────────────────┤
│ ➕ New Chat     │
├─────────────────┤
│ 💬 Main Chat    │ ← Active
│ 💬 Feature XYZ  │
│ 💬 Bug Fix #1   │
│ 📁 Archived     │
│   💬 Old Chat   │
└─────────────────┘
```

### **Chat Session Indicators**

- **Active**: Bold text, highlighted background
- **Unread**: Badge with message count
- **GitHub Status**: Branch icon with sync status
- **Last Activity**: Relative timestamp (2h ago, yesterday)
- **Message Count**: Small badge with total messages

### **Context Menu Options**

- 📝 Rename chat
- 📋 Duplicate chat session
- 📁 Archive chat
- 🌿 View GitHub branch
- 🗑️ Delete chat (with confirmation)

---

## **Migration Strategy**

### **Phase 1: Database Migration**

1. Create `chat_sessions` table
2. Add `chat_session_id` to `chat_messages`
3. Run migration script for existing data
4. Update database queries

### **Phase 2: Backend API**

1. Implement chat session management endpoints
2. Update existing chat API to use session IDs
3. Update agent service integration
4. Add GitHub branch correlation

### **Phase 3: Frontend Implementation**

1. Create chat sidebar components
2. Update chat interface state management
3. Implement responsive layout
4. Add session management features

### **Phase 4: GitHub Integration**

1. Update agent service to use session-based branching
2. Implement branch correlation in database
3. Add branch status indicators in UI
4. Test multi-session branch workflows

---

## **Testing Requirements**

### **Backend Testing**

- [ ] Chat session CRUD operations
- [ ] Message routing to correct sessions
- [ ] GitHub branch integration
- [ ] Database migration validation
- [ ] Concurrent session handling

### **Frontend Testing**

- [ ] Chat session switching
- [ ] Sidebar responsive behavior
- [ ] Session management actions
- [ ] Message persistence across sessions
- [ ] New chat creation flow

### **Integration Testing**

- [ ] Multi-session GitHub workflows
- [ ] Branch creation per chat session
- [ ] Agent commits to correct branches
- [ ] Session state synchronization
- [ ] Cross-session isolation

---

## **Performance Considerations**

### **Database Optimization**

- Proper indexing for chat session queries
- Message pagination within sessions
- Archived session cleanup policies
- Query optimization for session lists

### **Frontend Optimization**

- Lazy loading of chat sessions
- Virtual scrolling for large message lists
- Efficient state updates for active session
- Debounced search/filter operations

### **GitHub Integration**

- Branch caching for session status
- Batch branch status updates
- Optimistic UI updates for branch operations

---

## **Security Considerations**

### **Access Control**

- Users can only access their own chat sessions
- Project-level permissions enforced
- GitHub token scope validation per session

### **Data Privacy**

- Chat session data encryption at rest
- Secure session ID generation
- Audit trail for session operations

---

## **Rollout Plan**

### **MVP Features (Week 1-2)**

- [ ] Database schema implementation
- [ ] Basic chat session CRUD
- [ ] Simple sidebar with session list
- [ ] New chat creation

### **Core Features (Week 3-4)**

- [ ] Full sidebar UI with management features
- [ ] GitHub branch integration
- [ ] Session switching with state persistence
- [ ] Responsive design implementation

### **Advanced Features (Week 5-6)**

- [ ] Session archiving and organization
- [ ] Search and filter functionality
- [ ] GitHub branch status indicators
- [ ] Performance optimizations

---

## **Success Metrics**

### **User Experience**

- Chat session creation time < 2 seconds
- Session switching time < 1 second
- Zero message loss during session switches
- 100% GitHub branch correlation accuracy

### **Technical Performance**

- Support for 50+ chat sessions per project
- Sub-100ms API response times
- Efficient memory usage for multiple sessions
- Proper cleanup of archived sessions

---

## **Future Enhancements**

### **Advanced Features**

- Chat session templates
- Session sharing and collaboration
- Automated session organization
- AI-powered session summaries
- Integration with project milestones

### **GitHub Advanced Integration**

- Automatic PR creation from chat sessions
- Branch merge conflict detection
- Session-based code review workflows
- Integration with GitHub Issues/Projects

---

## **Dependencies**

### **Required Before Implementation**

- ✅ GitHub session-based branching (Ticket #19 - Completed)
- ✅ Agent service GitHub integration (Completed)
- ✅ Basic chat interface (Existing)

### **Related Tickets**

- Ticket #14: GitHub Branch Management & PR UI (Will build on this)
- Ticket #19: Project Settings Tab - Environment Variables (Parallel development)

---

## **Implementation Checklist**

### **Database**

- [ ] Create migration script for `chat_sessions` table
- [ ] Update `chat_messages` table schema
- [ ] Add `default_branch` column to `projects` table
- [ ] Run data migration for existing projects
- [ ] Add proper indexes and constraints
- [ ] Test migration on staging environment

### **Backend - Core Chat Sessions**

- [ ] Implement chat session management API
- [ ] Update chat API to use session IDs
- [ ] Add GitHub branch correlation
- [ ] Update agent service integration
- [ ] Add session-based authentication checks

### **Backend - NEW: Container Isolation**

- [ ] Create SessionManager service
- [ ] Implement session environment creation
- [ ] Update Agent class for session-specific directories
- [ ] Modify GitHubService for session isolation
- [ ] Add session cleanup mechanisms
- [ ] Update ClaudeCodeService for working directory support

### **Backend - NEW: Settings & Pull Requests**

- [ ] Implement default branch settings API
- [ ] Add GitHub branches listing endpoint
- [ ] Implement pull request creation API
- [ ] Add project settings management
- [ ] Add GitHub API integration for PR creation

### **Frontend - Core Components**

- [ ] Create ChatSidebar component
- [ ] Implement chat session state management
- [ ] Update chat interface for multi-session
- [ ] Add new chat creation flow
- [ ] Implement responsive design
- [ ] Add session management features

### **Frontend - NEW: UI Updates**

- [ ] Add Settings tab to navbar
- [ ] Implement default branch settings component
- [ ] Add Create Pull Request button to navbar
- [ ] Update model banner with branch display
- [ ] Extend project page layout for settings tab
- [ ] Add pull request creation modal/flow

### **Frontend - NEW: Session Integration**

- [ ] Update useSendMessage for session-specific requests
- [ ] Add session ID tracking in chat state
- [ ] Implement session switching without conflicts
- [ ] Add branch display in chat interface
- [ ] Update project state management for default branch

### **Integration & Testing**

- [ ] Test GitHub branch per session
- [ ] Validate agent commits to correct branches
- [ ] Test session isolation and directory separation
- [ ] Verify message persistence across sessions
- [ ] Test concurrent session handling
- [ ] Test pull request creation flow
- [ ] Validate settings persistence
- [ ] Test branch switching and display

### **Documentation**

- [ ] API documentation for new endpoints
- [ ] Database schema documentation
- [ ] User guide for multi-chat interface
- [ ] Developer guide for session management
- [ ] Container isolation architecture documentation
- [ ] Settings and PR management guides

---

## **Acceptance Criteria**

### **Core Functionality**

1. Users can create multiple chat sessions within a project
2. Each chat session has its own GitHub branch and isolated environment
3. Messages are properly isolated between sessions
4. Session switching preserves message history
5. Chat sessions can be renamed, archived, and deleted

### **NEW: Settings & Configuration**

1. Settings tab is accessible from project navigation
2. Users can configure default branch from dropdown of GitHub branches
3. Default branch setting persists and applies to new chat sessions
4. Settings interface integrates with existing environment variables tab

### **NEW: Pull Request Management**

1. Create Pull Request button is visible in navbar (left of avatar)
2. Button is disabled when no active chat session exists
3. Clicking button creates PR from active session branch to default branch
4. Created PR opens in new tab/window for user review
5. PR creation handles errors gracefully

### **NEW: Branch Display**

1. Model banner shows current branch name on the right side
2. Branch display updates when switching between chat sessions
3. Shows project default branch when no active chat session
4. Branch name is clearly readable and doesn't interfere with model info

### **NEW: Container Isolation**

1. Each chat session operates in its own isolated directory
2. File changes in one session don't affect other sessions
3. Sessions can run concurrently without conflicts
4. Session cleanup removes isolated directories when sessions end
5. Agent operations target correct session-specific directories

### **UI/UX Requirements**

1. Left sidebar shows all chat sessions for current project
2. Active chat session is clearly highlighted
3. New chat button is easily accessible
4. Session management actions are intuitive
5. Interface is responsive across all device sizes
6. Settings tab integrates seamlessly with existing tabs
7. PR button placement doesn't interfere with existing navbar elements

### **Technical Requirements**

1. Database migration completes without data loss
2. API endpoints handle concurrent session operations
3. GitHub branch creation is automatic per session
4. Agent commits to correct branch based on session
5. Performance meets specified metrics
6. Session isolation doesn't significantly impact performance
7. GitHub integration works reliably for PR creation
8. Default branch configuration persists correctly

### **Quality Assurance**

1. All automated tests pass
2. Manual testing covers all user workflows
3. Cross-browser compatibility verified
4. Accessibility standards met (WCAG 2.1 AA)
5. Security review completed and approved
6. Container isolation security tested
7. GitHub token permissions validated for PR creation

---

## **NEW: Architectural Summary**

### **Key Changes Overview**

This expanded ticket introduces significant architectural enhancements that transform Kosuke into a multi-session development environment:

| **Feature**            | **Current State**              | **New State**                  | **Impact**                          |
| ---------------------- | ------------------------------ | ------------------------------ | ----------------------------------- |
| **Chat Sessions**      | Single session per project     | Multiple isolated sessions     | ✅ Parallel development workflows   |
| **File System**        | Shared project directory       | Session-specific directories   | ✅ Complete isolation, no conflicts |
| **GitHub Integration** | Project-level branching        | Session-level branching        | ✅ Granular version control         |
| **UI Navigation**      | 3 tabs (Preview/Code/Branding) | 4 tabs + PR management         | ✅ Enhanced project management      |
| **Settings**           | Environment variables only     | + Default branch configuration | ✅ Flexible project setup           |

### **Benefits for Users**

1. **Parallel Development**: Work on multiple features simultaneously without conflicts
2. **Branch Management**: Each conversation creates its own Git branch automatically
3. **Pull Request Workflow**: Direct PR creation from chat sessions
4. **Flexible Configuration**: Set custom default branches per project
5. **Complete Isolation**: Session changes don't affect other sessions
6. **Visual Clarity**: Always know which branch you're working on

### **Benefits for Developers**

1. **Clean Architecture**: Session isolation prevents cross-session contamination
2. **Scalable Design**: Support for unlimited concurrent sessions per project
3. **GitHub Integration**: Seamless PR workflow with proper branch management
4. **Resource Management**: Automatic cleanup of session environments
5. **Extensible Framework**: Easy to add new session-specific features

### **Migration Path**

**Phase 1** (Weeks 1-2): Database schema and session isolation
**Phase 2** (Weeks 3-4): Frontend UI updates and settings integration
**Phase 3** (Weeks 5-6): Pull request management and advanced features
**Phase 4** (Week 7): Performance optimization and cleanup

---

_This ticket provides a comprehensive foundation for implementing multiple chat sessions with GitHub branch integration, setting up the perfect workflow for collaborative development within Kosuke projects._
