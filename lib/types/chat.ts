// Core Chat Types
export interface ChatMessage {
  id: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  actions?: Action[];
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  hasError?: boolean;
  errorType?: ErrorType;
  metadata?: string;
}

// Action/Operation Types
export interface Action {
  path: string;
  type: 'create' | 'update' | 'delete' | 'edit' | 'read' | 'search' | 'createDir' | 'removeDir';
  timestamp: Date;
  status: 'pending' | 'completed' | 'error';
  messageId?: number;
  language?: string;
  content?: string;
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
  stripeCustomerId: string | null;
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
  content: string;
  role: string;
  timestamp: string | Date;
  actions?: Action[];
  tokensInput?: number;
  tokensOutput?: number;
  contextTokens?: number;
  metadata?: string;
}

// Component Props Types
export interface ChatMessageProps {
  id?: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isLoading?: boolean;
  className?: string;
  user?: {
    name?: string;
    email?: string;
    imageUrl?: string;
  };
  actions?: Action[];
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
}

export interface AssistantActionsCardProps {
  operations: Action[];
  className?: string;
}

// Content Block Types
export interface ContentBlock {
  id: string;
  index: number;
  type: 'thinking' | 'text' | 'tool';
  content: string;
  status: 'streaming' | 'completed';
  isCollapsed?: boolean; // For thinking blocks
  timestamp: Date;
  toolName?: string; // For tool blocks
  toolResult?: string; // For tool blocks
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
  streamingActions: Action[];
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
    | 'tool_complete'
    | 'task_summary'
    | 'message_complete'
    | 'error'
    | 'text'
    | 'operation_start'
    | 'operation_complete'
    | 'completed';

  // Content delta fields
  text?: string; // For text content deltas
  thinking?: string; // For thinking content deltas
  delta_type?: 'text_delta' | 'thinking_delta' | 'input_json_delta' | 'signature_delta';
  index?: number; // Content block index

  // Tool-related fields
  tool_name?: string; // Name of the tool being executed
  result?: string; // Tool execution result
  summary?: string; // Task completion summary

  // Legacy fields (for backward compatibility)
  file_path?: string;
  message?: string;
  status?: 'pending' | 'completed' | 'error';
  operation?: string;
}
