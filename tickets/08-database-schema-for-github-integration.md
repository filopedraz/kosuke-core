# 📋 Ticket 8: Database Schema for GitHub Integration

**Priority:** Critical  
**Estimated Effort:** 2 hours

## Description

Add database tables and fields to support GitHub integration, including repository linking and user tokens.

## Files to Create/Update

```
lib/db/migrations/XXXX_github_integration.sql
lib/db/schema.ts (update)
```

## Implementation Details

**lib/db/migrations/XXXX_github_integration.sql** - Migration file:

```sql
-- Add GitHub fields to projects table
ALTER TABLE projects ADD COLUMN github_repo_url TEXT;
ALTER TABLE projects ADD COLUMN github_owner TEXT;
ALTER TABLE projects ADD COLUMN github_repo_name TEXT;
ALTER TABLE projects ADD COLUMN github_branch TEXT DEFAULT 'main';
ALTER TABLE projects ADD COLUMN auto_commit BOOLEAN DEFAULT true;
ALTER TABLE projects ADD COLUMN last_github_sync TIMESTAMP;

-- Create user GitHub tokens table
CREATE TABLE user_github_tokens (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_token TEXT NOT NULL,
    github_username TEXT,
    token_scope TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create project commits tracking table
CREATE TABLE project_commits (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    commit_sha TEXT NOT NULL,
    commit_message TEXT NOT NULL,
    commit_url TEXT,
    files_changed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create GitHub sync sessions table (for checkpoint commits)
CREATE TABLE github_sync_sessions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    commit_sha TEXT,
    files_changed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' -- active, completed, failed
);

-- Add indexes for performance
CREATE INDEX idx_user_github_tokens_user_id ON user_github_tokens(user_id);
CREATE INDEX idx_project_commits_project_id ON project_commits(project_id);
CREATE INDEX idx_github_sync_sessions_project_id ON github_sync_sessions(project_id);
CREATE INDEX idx_github_sync_sessions_session_id ON github_sync_sessions(session_id);
```

**lib/db/schema.ts** - Update schema:

```typescript
// Add to existing schema file
export const userGithubTokens = pgTable('user_github_tokens', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  githubToken: text('github_token').notNull(),
  githubUsername: text('github_username'),
  tokenScope: text('token_scope').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const projectCommits = pgTable('project_commits', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  commitSha: text('commit_sha').notNull(),
  commitMessage: text('commit_message').notNull(),
  commitUrl: text('commit_url'),
  filesChanged: integer('files_changed').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const githubSyncSessions = pgTable('github_sync_sessions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  startTime: timestamp('start_time').defaultNow(),
  endTime: timestamp('end_time'),
  commitSha: text('commit_sha'),
  filesChanged: integer('files_changed').default(0),
  status: text('status').default('active'), // active, completed, failed
});

// Update projects table
export const projects = pgTable('projects', {
  // ... existing fields
  githubRepoUrl: text('github_repo_url'),
  githubOwner: text('github_owner'),
  githubRepoName: text('github_repo_name'),
  githubBranch: text('github_branch').default('main'),
  autoCommit: boolean('auto_commit').default(true),
  lastGithubSync: timestamp('last_github_sync'),
});
```

## Acceptance Criteria

- [x] Database migration created and applied
- [x] Schema updated with GitHub fields
- [x] Proper indexes and foreign keys
- [x] Support for tokens, commits, and sync sessions
