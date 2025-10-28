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

// Enhanced repository selection types for project creation
export interface GitHubRepositoryOption {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface RepositoryCreationConfig {
  name: string;
  description?: string;
  private: boolean;
  auto_init: boolean;
  gitignore_template?: string;
  license_template?: string;
}

export interface ProjectGitHubSettings {
  repositoryName: string;
  description: string;
  isPrivate: boolean;
  autoInit: boolean;
}

// Branch and Pull Request summaries
export interface BranchSummary {
  name: string;
  commitSha: string;
  protected: boolean;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  headRef: string;
  baseRef: string;
  url: string;
}

// Repository creation from template
export interface CreateRepositoryFromTemplateRequest {
  name: string;
  description?: string;
  private: boolean;
  templateRepo: string;
}

export interface GitHubRepoResponse {
  name: string;
  owner: string;
  url: string;
  private: boolean;
  description?: string;
}
