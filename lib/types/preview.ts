// Preview Panel and Project Preview Types

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
}

export interface StartPreviewResponse {
  success: boolean;
  url?: string;
  previewUrl?: string;
  error?: string;
}

export interface StopPreviewResponse {
  success: boolean;
  error?: string;
}

// Preview Panel Hook Types
export interface UsePreviewPanelOptions {
  projectId: number;
  sessionId: string | null;
  projectName: string;
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

  // Actions
  handleRefresh: (forceStart?: boolean) => Promise<void>;
  openInNewTab: () => void;
  handleDownloadZip: () => Promise<void>;
  handleTryAgain: () => Promise<void>;

  // Status helpers
  getStatusMessage: () => string;
  getStatusIconType: () => 'ready' | 'error' | 'loading';
}
