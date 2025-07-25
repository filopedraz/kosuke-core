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
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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