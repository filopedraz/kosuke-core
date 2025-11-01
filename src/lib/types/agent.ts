/**
 * Agent Types
 * Centralized type definitions for the Claude Agent SDK integration
 */

// ============================================
// Stream Events (for client consumption)
// ============================================

export type StreamEvent =
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | ToolStartEvent
  | ToolStopEvent
  | MessageCompleteEvent
  | ErrorEvent;

export interface ContentBlockStartEvent {
  type: 'content_block_start';
  index?: number;
}

export interface ContentBlockDeltaEvent {
  type: 'content_block_delta';
  delta_type: 'text_delta';
  text: string;
  index: number;
}

export interface ContentBlockStopEvent {
  type: 'content_block_stop';
  index?: number;
}

export interface ToolStartEvent {
  type: 'tool_start';
  tool_name: string;
  tool_input: unknown;
  tool_id: string;
}

export interface ToolStopEvent {
  type: 'tool_stop';
  tool_id: string;
  tool_result: unknown;
  is_error: boolean;
}

interface MessageCompleteEvent {
  type: 'message_complete';
}

interface ErrorEvent {
  type: 'error';
  message: string;
}

// ============================================
// Message Blocks (for database storage)
// ============================================

export type MessageBlock = TextBlock | ToolUseBlock | ToolResultBlock;

interface TextBlock {
  type: 'text';
  content: string;
}

interface ToolUseBlock {
  type: 'tool';
  id: string;
  name: string;
  input: unknown;
  status: 'pending' | 'completed' | 'error';
  result?: unknown;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: unknown;
  is_error?: boolean;
}

// ============================================
// Agent Configuration
// ============================================

export interface AgentConfig {
  projectId: number;
  sessionId: string;
  githubToken: string | null;
  assistantMessageId: number;
  userId: string;
}

export interface AgentOptions {
  maxTurns?: number;
  permissionMode?: 'acceptEdits'; // SDK only supports acceptEdits
  allowedTools?: string[];
}

// ============================================
// Git Operations
// ============================================

export interface GitHubCommit {
  sha: string;
  message: string;
  url: string;
  filesChanged: number;
  timestamp: Date;
}

export interface CommitOptions {
  sessionPath: string;
  sessionId: string;
  message?: string;
  githubToken: string;
  userId: string;
}

export interface GitChangesSummary {
  changedFiles: string[];
  additions: number;
  deletions: number;
}

// ============================================
// Event Processing State
// ============================================

export interface TextState {
  active: boolean;
  content: string;
  allBlocks: MessageBlock[];
}
