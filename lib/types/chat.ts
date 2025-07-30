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

// Streaming Types
export interface StreamingState {
  isStreaming: boolean;
  streamingActions: Action[];
  streamingContent: string;
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
  type: string;
  file_path: string;
  message: string;
  status: 'pending' | 'completed' | 'error';
}
