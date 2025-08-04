// GitHub Integration Types

export interface GitHubInfo {
  githubUsername: string;
  githubId: string;
  connectedAt: string;
}

export interface GitHubStatus {
  connected: boolean;
  hasValidScopes: boolean;
  username?: string;
  connectedAt?: string;
  githubId?: string;
}

export interface GitHubScope {
  name: string;
  description: string;
  icon?: string;
}

export interface GitHubAccountState {
  githubInfo: GitHubInfo | null;
  isLoading: boolean;
  isDisconnecting: boolean;
  error: string | null;
}

// API Response Types
export interface GitHubStatusResponse {
  connected: boolean;
  hasValidScopes: boolean;
  apiConnected?: boolean;
  githubUsername?: string;
  githubId?: string;
  connectedAt?: string;
}

export interface GitHubDisconnectResponse {
  success: boolean;
  message?: string;
}

// Webhook Types
export interface GitHubCommitData {
  sha: string;
  message: string;
  url?: string;
  files_changed: number;
  timestamp: string;
}

export interface GitHubSessionSummary {
  session_id: string;
  project_id: number;
  files_changed: number;
  duration?: number;
  status: 'active' | 'completed' | 'failed';
}

export interface GitHubCommitWebhook {
  commit_sha: string;
  commit_message: string;
  files_changed: number;
  timestamp: string;
}

export interface GitHubWebhookData {
  githubCommit?: GitHubCommitData;
  sessionSummary?: GitHubSessionSummary;
}
