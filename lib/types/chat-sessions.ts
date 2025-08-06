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
  // GitHub merge status
  branchMergedAt?: string;
  branchMergedBy?: string;
  mergeCommitSha?: string;
  pullRequestNumber?: number;
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

// Chat Sidebar Hook Types
export interface UseChatSidebarOptions {
  projectId: number;
  activeChatSessionId: number | null;
  onChatSessionChange: (sessionId: number) => void;
}

export interface UseChatSidebarReturn {
  // State
  sessions: ChatSession[];
  activeSessions: ChatSession[];
  archivedSessions: ChatSession[];
  isNewChatModalOpen: boolean;
  editingSession: ChatSession | null;
  newChatTitle: string;
  showArchived: boolean;

  // Actions
  setIsNewChatModalOpen: (open: boolean) => void;
  setEditingSession: (session: ChatSession | null) => void;
  setNewChatTitle: (title: string) => void;
  setShowArchived: (show: boolean) => void;
  handleCreateChat: () => Promise<void>;
  handleUpdateSession: (session: ChatSession, updates: Partial<ChatSession>) => Promise<void>;
  handleDeleteSession: (session: ChatSession) => Promise<void>;
  handleDuplicateSession: (session: ChatSession) => Promise<void>;
  handleViewGitHubBranch: (session: ChatSession) => void;

  // Utilities
  formatRelativeTime: (dateString: string) => string;

  // Loading states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}
