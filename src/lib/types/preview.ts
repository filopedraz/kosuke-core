// Preview Panel and Project Preview Types

// Git Update Status Types
interface GitUpdateStatus {
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

// Pull Operation Types
export interface PullRequest {
  force?: boolean;
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
