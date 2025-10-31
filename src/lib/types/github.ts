// GitHub Integration Types

export interface GitHubInfo {
  githubUsername: string;
  githubId: string;
  connectedAt: string;
}

export interface GitHubScope {
  name: string;
  description: string;
  icon?: string;
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

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectGitHubSettings {
  repositoryName: string;
  description: string;
  isPrivate: boolean;
  autoInit: boolean;
}
