/**
 * Types for unified streaming chat events
 * These types define the structure of events sent from the unified streaming endpoint
 */

export interface StreamingAction {
  type: string;
  path: string;
  status: 'pending' | 'completed' | 'error';
  message: string;
}

export interface StreamEvent {
  type: 'message_update' | 'action_update' | 'stream_complete' | 'stream_error';
  messageId: number;
  content?: string;
  action?: StreamingAction;
  totalActions?: number;
  error?: string;
}

export interface StreamingChatParams {
  projectId: number;
  userMessage: string;
  assistantMessageId: number;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  includeContext?: boolean;
  contextFiles?: string[];
}

/**
 * Response type for successful message sending
 */
export interface SendMessageResponse {
  message: {
    id: number;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
  };
  success: boolean;
  fileUpdated?: boolean;
  totalTokensInput?: number;
  totalTokensOutput?: number;
  contextTokens?: number;
  error?: string;
  errorType?: 'timeout' | 'parsing' | 'processing' | 'unknown';
}

/**
 * Options for sending messages
 */
export interface MessageOptions {
  includeContext?: boolean;
  contextFiles?: string[];
  imageFile?: File;
}
