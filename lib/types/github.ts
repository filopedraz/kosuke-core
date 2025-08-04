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

// Repository Types - Extended from ticket specification
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

export interface CreateRepositoryData {
  name: string;
  description?: string;
  private: boolean;
  auto_init?: boolean;
}

export interface ImportRepositoryData {
  repository_url: string;
  access_token?: string;
}

export interface GitHubWebhookPayload {
  action: string;
  repository: GitHubRepository;
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    modified: string[];
    added: string[];
    removed: string[];
  }>;
}
