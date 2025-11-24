import type { CliLogCommand, CliLogStatus } from '@/lib/db/schema';

import { createQueue } from '../client';
import { JOB_NAMES, QUEUE_NAMES } from '../config';

/**
 * CLI Logs queue
 * Handles async processing of CLI command logs from kosuke-cli
 */

export interface CliLogJobData {
  // Project context
  projectId: string;
  orgId?: string;
  userId?: string;

  // Command details
  command: CliLogCommand;
  commandArgs?: Record<string, unknown>;

  // Execution status
  status: CliLogStatus;
  errorMessage?: string;

  // Token usage
  tokensInput: number;
  tokensOutput: number;
  tokensCacheCreation?: number;
  tokensCacheRead?: number;
  cost: string;

  // Performance
  executionTimeMs: number;
  inferenceTimeMs?: number;

  // Command results
  fixesApplied?: number;
  testsRun?: number;
  testsPassed?: number;
  testsFailed?: number;
  iterations?: number;
  filesModified?: string[];

  // Metadata
  cliVersion?: string;
  metadata?: Record<string, unknown>;

  // Conversation Data (full capture for tickets/requirements commands)
  conversationMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    toolCalls?: Array<{
      name: string;
      input: Record<string, unknown>;
      output?: string | Record<string, unknown>;
    }>;
  }>;

  // Timestamps
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
}

export const cliLogsQueue = createQueue<CliLogJobData>(QUEUE_NAMES.CLI_LOGS);

/**
 * Add CLI log job to the queue
 */
export async function addCliLogJob(data: CliLogJobData) {
  return await cliLogsQueue.add(JOB_NAMES.PROCESS_CLI_LOG, data, {
    priority: 1,
    removeOnComplete: true,
  });
}
