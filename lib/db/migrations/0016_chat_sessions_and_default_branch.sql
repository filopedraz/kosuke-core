-- Migration: Add chat sessions and default branch support
-- This migration implements the multi-chat sessions architecture

-- Create chat_sessions table
CREATE TABLE chat_sessions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
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

-- Create indexes for chat_sessions
CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);

-- Add chat_session_id to chat_messages
ALTER TABLE chat_messages
ADD COLUMN chat_session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- Create index for chat_messages.chat_session_id
CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);

-- Add default_branch to projects table
ALTER TABLE projects
ADD COLUMN default_branch VARCHAR(100) DEFAULT 'main';

-- Create index for projects.default_branch
CREATE INDEX idx_projects_default_branch ON projects(default_branch);

-- Migration: Create default chat sessions for existing projects
INSERT INTO chat_sessions (project_id, user_id, title, session_id, is_default, message_count)
SELECT
  p.id as project_id,
  p.created_by as user_id,
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
