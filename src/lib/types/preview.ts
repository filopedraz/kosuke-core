// Preview Panel and Project Preview Types

// Git Update Status Types
export interface GitUpdateStatus {
  success: boolean;
  action: 'cached' | 'pulled' | 'error' | 'no_remote';
  message: string;
  commits_pulled: number;
  last_pull_time?: string;
  previous_commit?: string;
  new_commit?: string;
  error?: string;
  branch_name?: string;
}

export interface PullResponse {
  success: boolean;
  pullResult: {
    changed: boolean;
    commitsPulled: number;
    message: string;
    previousCommit?: string;
    newCommit?: string;
    branchName?: string;
  };
  container_restarted: boolean;
}

// Preview Status Types
export type PreviewStatus = 'loading' | 'ready' | 'error';
export type BuildStatus = 'building' | 'compiling' | 'ready' | 'error';

// Preview Panel State
export interface PreviewPanelState {
  status: PreviewStatus;
  progress: number;
  previewUrl: string | null;
  error: string | null;
  iframeKey: number;
  isDownloading: boolean;
  isRequestInProgress: boolean;
  gitStatus?: GitUpdateStatus | null;
}

// Server Health Check Types
export interface ServerHealthOptions {
  url: string;
  maxAttempts?: number;
  timeout?: number;
  initialDelay?: number;
  retryDelay?: number;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  attempts: number;
  error?: string;
}

// File System Types for Code Explorer
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FileContent {
  content: string;
  language: string;
}

// Code Explorer State
export interface CodeExplorerState {
  files: FileNode[];
  selectedFile: string | null;
  fileContent: FileContent | null;
  isLoadingFiles: boolean;
  isLoadingContent: boolean;
  error: string | null;
}

// Download Types
export interface DownloadProgress {
  isDownloading: boolean;
  progress: number;
  fileName?: string;
}

// Preview Response Types
export interface PreviewStatusResponse {
  status: PreviewStatus;
  url?: string;
  previewUrl?: string;
  progress?: number;
  error?: string;
  running?: boolean;
  is_responding?: boolean;
}

export interface StartPreviewResponse {
  success: boolean;
  url?: string;
  previewUrl?: string;
  error?: string;
  project_id?: number;
  session_id?: string;
  running?: boolean;
  is_responding?: boolean;
}

export interface StopPreviewResponse {
  success: boolean;
  error?: string;
}

// Preview Panel Hook Types
export interface UsePreviewPanelOptions {
  projectId: number;
  sessionId: string;
  projectName: string;
  enabled?: boolean;
}

export interface UsePreviewPanelReturn {
  // State
  status: PreviewStatus;
  progress: number;
  previewUrl: string | null;
  error: string | null;
  iframeKey: number;
  isDownloading: boolean;
  isStarting: boolean;
  gitStatus?: GitUpdateStatus | null;

  // Actions
  handleRefresh: (forceStart?: boolean) => Promise<void>;
  openInNewTab: () => void;
  handleDownloadZip: () => Promise<void>;
  handleTryAgain: () => Promise<void>;

  // Status helpers
  getStatusMessage: () => string;
  getStatusIconType: () => 'ready' | 'error' | 'loading';
}
