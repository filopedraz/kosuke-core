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
