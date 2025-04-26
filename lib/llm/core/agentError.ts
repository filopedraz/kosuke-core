import { AgentErrorType } from './types';

/**
 * Custom AgentError class for handling agent-specific errors
 */
export class AgentError extends Error {
  type: AgentErrorType;
  details?: string;

  constructor({
    type,
    message,
    details,
  }: {
    type: AgentErrorType;
    message: string;
    details?: string;
  }) {
    super(message);
    this.type = type;
    this.details = details;
    this.name = 'AgentError';

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AgentError);
    }
  }
}

/**
 * Classify an error by type
 */
export function classifyError(error: unknown): AgentErrorType {
  if (error instanceof AgentError) {
    return error.type;
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return 'timeout';
    }
    if (error.message.includes('parse') || error.message.includes('JSON')) {
      return 'parsing';
    }
  }

  return 'unknown';
}

/**
 * Get an appropriate error message based on error type
 */
export function getErrorMessage(error: unknown, errorType: AgentErrorType): string {
  switch (errorType) {
    case 'timeout':
      return 'The request took too long to process. Please try a simpler request or try again later.';
    case 'parsing':
      return 'There was an error processing the AI response. Please try again or simplify your request.';
    case 'processing':
      return 'There was an error processing your request. Please try rephrasing it.';
    case 'unknown':
    default:
      return error instanceof Error
        ? `Error: ${error.message}`
        : 'An unexpected error occurred. Please try again later.';
  }
}
