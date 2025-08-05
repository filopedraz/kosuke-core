// Chat session types for multi-session architecture
import type { ChatMessage } from './chat';

export interface ChatSession {
  id: number;
  projectId: number;
  userId: string;
  title: string;
  description?: string;
  sessionId: string; // Used for GitHub branch naming
  githubBranchName?: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  messageCount: number;
  isDefault: boolean;
}

export interface CreateChatSessionData {
  title: string;
  description?: string;
}

export interface UpdateChatSessionData {
  title?: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
}

export interface ChatSessionListResponse {
  sessions: ChatSession[];
  total: number;
}

export interface ChatSessionMessagesResponse {
  messages: ChatMessage[];
  sessionInfo: {
    id: number;
    sessionId: string;
    title: string;
    status: string;
    messageCount: number;
  };
}

// Settings types for default branch configuration
export interface DefaultBranchSettings {
  default_branch: string;
  available_branches: string[];
}

export interface UpdateDefaultBranchData {
  default_branch: string;
}

// Pull Request types
export interface CreatePullRequestData {
  title?: string;
  description?: string;
  target_branch?: string;
}

export interface CreatePullRequestResponse {
  pull_request_url: string;
  pull_request_number: number;
  title: string;
  source_branch: string;
  target_branch: string;
  success: boolean;
}

// GitHub branch information
export interface GitHubBranch {
  name: string;
  commit_sha: string;
  is_default: boolean;
}
