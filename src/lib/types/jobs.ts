/**
 * Job and Queue Type Definitions
 *
 * Type-safe interfaces for BullMQ queue monitoring and management.
 */

/**
 * Queue metrics interface
 */
export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Job summary interface
 */
export interface JobSummary {
  id: string;
  name: string;
  queueName: string;
  data: Record<string, unknown>;
  timestamp: number | undefined;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  returnvalue?: unknown;
  progress?: number | object;
  attemptsMade?: number;
  stacktrace?: string[];
}

/**
 * Repeatable job interface (scheduled/cron jobs)
 */
export interface RepeatableJob {
  key: string;
  name: string;
  queueName: string;
  pattern: string;
  next: number | undefined;
  tz?: string | null;
}

/**
 * Job status types
 */
// TODO: Uncomment when needed
// export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

/**
 * Trigger job request
 */
// TODO: Uncomment when needed
// export interface TriggerJobRequest {
//   jobName: string;
//   queueName: string;
//   data?: Record<string, unknown>;
// }

/**
 * Job history query params
 */
// TODO: Uncomment when needed
// export interface JobHistoryParams {
//   queueName: string;
//   type: 'completed' | 'failed' | 'waiting' | 'delayed';
//   start?: number;
//   end?: number;
//   search?: string;
// }

/**
 * Queue action request
 */
// TODO: Uncomment when needed
// export interface QueueActionRequest {
//   queueName: string;
// }

/**
 * Retry job request
 */
// TODO: Uncomment when needed
// export interface RetryJobRequest {
//   queueName: string;
//   jobId: string;
// }

/**
 * Remove job request
 */
// TODO: Uncomment when needed
// export interface RemoveJobRequest {
//   queueName: string;
//   jobId: string;
// }

/**
 * Remove scheduled job request
 */
// TODO: Uncomment when needed
// export interface RemoveScheduledJobRequest {
//   queueName: string;
//   jobKey: string;
// }
