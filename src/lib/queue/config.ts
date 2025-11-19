/**
 * BullMQ Queue Constants
 *
 * Centralized queue and job names for type safety and consistency.
 * Import these constants instead of using string literals to prevent typos.
 */

/**
 * Queue names - one queue per domain/feature
 */
export const QUEUE_NAMES = {
  CLI_LOGS: 'cli-logs',
} as const;

/**
 * Job names - organized by queue
 */
export const JOB_NAMES = {
  // CLI Logs queue jobs
  PROCESS_CLI_LOG: 'process-cli-log',
} as const;
