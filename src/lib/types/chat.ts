// Tool Input Types
type ToolInput = Record<string, unknown>;

// Assistant Response Block Types
export type AssistantBlock =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string; signature?: string }
  | {
      type: 'tool';
      name: string;
      input: ToolInput;
      result?: string;
      status: 'running' | 'completed' | 'error';
    };

// Core Chat Types
export interface ChatMessage {
  id: string;
  content?: string; // For user messages (optional for assistant messages)
  blocks?: AssistantBlock[]; // For assistant response blocks
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  commitSha?: string; // NEW: Git commit SHA for revert functionality
  hasError?: boolean;
  errorType?: ErrorType;
  metadata?: {
    revertInfo?: { messageId: string; commitSha: string; timestamp: string };
    [key: string]: unknown;
  };
}

// Error Types
export type ErrorType = 'timeout' | 'parsing' | 'processing' | 'unknown';

// Message Options for Sending
export interface MessageOptions {
  includeContext?: boolean;
  contextFiles?: string[];
  imageFile?: File;
}

// API Response Types
export interface ApiChatMessage {
  id: string;
  projectId: string;
  userId: number | null;
  content?: string; // For user messages
  blocks?: AssistantBlock[]; // For assistant messages
  role: string;
  timestamp: string | Date;
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  metadata?: string;
}

// Component Props Types
export interface ChatMessageProps {
  id?: string;
  content?: string; // For user messages
  blocks?: AssistantBlock[]; // For assistant response blocks
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isLoading?: boolean;
  className?: string;
  user?: {
    name?: string;
    email?: string;
    imageUrl?: string;
  };
  showAvatar?: boolean;
  hasError?: boolean;
  errorType?: ErrorType;
  onRegenerate?: () => void;
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  commitSha?: string; // NEW: Git commit SHA for revert functionality
  projectId?: string; // NEW: Project ID for revert operations
  chatSessionId?: string; // NEW: Chat session ID for revert operations
  sessionId?: string; // NEW: Session ID string for revert operations
  metadata?: {
    revertInfo?: { messageId: string; commitSha: string; timestamp: string };
    [key: string]: unknown;
  }; // NEW: System message metadata
}

export interface ChatInputProps {
  onSendMessage: (message: string, options?: MessageOptions) => Promise<void>;
  isLoading?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  placeholder?: string;
  className?: string;
}

export interface ChatInterfaceProps {
  projectId: string;
  className?: string;
  activeChatSessionId?: string | null;
  currentBranch?: string;
  sessionId?: string; // Session ID for fetching session-specific messages
}

// Content Block Types (for streaming UI state)
export interface ContentBlock {
  id: string;
  index: number;
  type: 'thinking' | 'text' | 'tool';
  content: string;
  status: 'streaming' | 'completed' | 'error';
  isCollapsed?: boolean; // For thinking blocks
  timestamp: Date;
  toolName?: string; // For tool blocks
  toolResult?: string; // For tool blocks
  toolInput?: ToolInput; // For tool blocks - contains input parameters like file_path
  toolId?: string; // For tool blocks - unique identifier for matching tool_start/tool_stop events
}

// Webhook Data Types
export interface WebhookAssistantData {
  content?: string; // For simple text responses
  blocks?: AssistantBlock[]; // For complex responses with multiple blocks
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  assistantMessageId?: string; // ID of assistant message to update
  commitSha?: string; // Git commit SHA for revert functionality
  chatSessionId?: string; // For fallback message creation
}

// Assistant Response Types
export interface AssistantResponse {
  id: string;
  contentBlocks: ContentBlock[];
  timestamp: Date;
  status: 'streaming' | 'completed';
}

// File Upload Types
export interface AttachedImage {
  file: File;
  previewUrl: string;
}

// Streaming Event Types (from Python agent)
export interface StreamingEvent {
  // Event type from Anthropic API
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop'
    | 'tool_start'
    | 'tool_stop'
    | 'task_summary'
    | 'message_complete'
    | 'error'
    | 'text'
    | 'completed';

  // Content delta fields
  text?: string; // For text content deltas
  thinking?: string; // For thinking content deltas
  delta_type?: 'text_delta' | 'thinking_delta' | 'input_json_delta' | 'signature_delta';
  index?: number; // Content block index

  // Tool-related fields
  tool_name?: string; // Name of the tool being executed
  tool_input?: ToolInput; // Tool input parameters (for tool_start events)
  tool_id?: string; // Tool ID (for tool_start and tool_stop events)
  tool_result?: string; // Tool execution result (for tool_stop events)
  is_error?: boolean; // Whether the tool execution failed (for tool_stop events)
  result?: string; // Legacy tool execution result
  summary?: string; // Task completion summary
}

// Revert Operation Types
export interface RevertToMessageRequest {
  message_id: string;
  create_backup_commit?: boolean;
}

export interface RevertToMessageResponse {
  success: boolean;
  reverted_to_commit: string;
  backup_commit?: string;
  message: string;
}
