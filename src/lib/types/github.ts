// GitHub Integration Types

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
  repositoryName?: string;
  description?: string;
  isPrivate?: boolean;
  autoInit: boolean;
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
