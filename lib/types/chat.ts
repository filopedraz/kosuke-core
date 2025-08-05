// Tool Input Types
export type ToolInput = Record<string, unknown>;

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
  id: number;
  content?: string; // For user messages (optional for assistant messages)
  blocks?: AssistantBlock[]; // For assistant response blocks
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  hasError?: boolean;
  errorType?: ErrorType;
  metadata?: string;
}

// Error Types
export type ErrorType = 'timeout' | 'parsing' | 'processing' | 'unknown';

// User Types for Chat
export interface ChatUser {
  id: number;
  role: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  marketingEmails: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Token Usage Types
export interface TokenUsageMetrics {
  tokensSent: number;
  tokensReceived: number;
  contextSize: number;
}

// Message Options for Sending
export interface MessageOptions {
  includeContext?: boolean;
  contextFiles?: string[];
  imageFile?: File;
}

// API Response Types
export interface ApiChatMessage {
  id: number;
  projectId: number;
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
  id?: number;
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
  projectId: number;
  initialMessages?: Omit<ChatMessageProps, 'isLoading' | 'className'>[];
  className?: string;
  isLoading?: boolean;
  activeChatSessionId?: number | null;
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
  assistantMessageId?: number; // ID of assistant message to update
}

// Assistant Response Types
export interface AssistantResponse {
  id: number;
  contentBlocks: ContentBlock[];
  timestamp: Date;
  status: 'streaming' | 'completed';
}

// Streaming Types
export interface StreamingState {
  isStreaming: boolean;
  streamingContentBlocks: ContentBlock[];
  streamingAssistantMessageId: number | null;
  streamAbortController: AbortController | null;
}

// File Upload Types
export interface AttachedImage {
  file: File;
  previewUrl: string;
}

// Chat State Types
export interface ChatState {
  isError: boolean;
  errorMessage: string;
  errorType: ErrorType;
  lastUserMessage: string;
  lastMessageOptions: MessageOptions | null;
  isRegenerating: boolean;
  tokenUsage: TokenUsageMetrics;
}

// API Error Response Types
export interface ChatApiError {
  error: string;
  errorType?: ErrorType;
  code?: string;
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
