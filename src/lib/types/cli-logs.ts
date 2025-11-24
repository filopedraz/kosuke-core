import type { CliLog, CliLogCommand, CliLogStatus } from '@/lib/db/schema';

export type { CliLog, CliLogCommand, CliLogStatus };

/**
 * Tool call data in conversation messages
 */
interface ConversationToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: string | Record<string, unknown>;
}

/**
 * Conversation message data
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ConversationToolCall[];
}

/**
 * Statistics for CLI logs dashboard
 */
export interface CliLogStats {
  totalCommands: number;
  successRate: number;
  totalCost: string;
  avgResponseTimeMs: number;
  totalTokens: number;
  cacheHitRate: number;

  // Status breakdown
  statusCounts: {
    success: number;
    error: number;
    cancelled: number;
  };

  // Command breakdown
  commandCounts: Record<CliLogCommand, number>;
}

/**
 * Filters for CLI logs list
 */
// TODO: Uncomment when needed
// export interface CliLogFilters {
//   projectId?: string;
//   command?: CliLogCommand;
//   status?: CliLogStatus;
//   startDate?: string;
//   endDate?: string;
//   limit?: number;
//   offset?: number;
// }
