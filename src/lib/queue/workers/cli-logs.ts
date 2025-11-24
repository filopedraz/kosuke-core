/**
 * CLI Logs Worker
 *
 * Thin wrapper - only handles worker lifecycle and events.
 * Business logic is in jobs/process-cli-log.ts
 */
import { createQueueEvents, createWorker } from '../client';
import { QUEUE_NAMES } from '../config';
import { processCliLog } from '../jobs/process-cli-log';
import type { CliLogJobData } from '../queues/cli-logs';

/**
 * CLI logs worker
 */
export const cliLogsWorker = createWorker<CliLogJobData>(
  QUEUE_NAMES.CLI_LOGS,
  async job => {
    // Just call the processor - no business logic here!
    return await processCliLog(job.data);
  },
  {
    concurrency: 10, // Process 10 logs concurrently
  }
);

/**
 * Queue events for monitoring
 */
const cliLogsEvents = createQueueEvents(QUEUE_NAMES.CLI_LOGS);

let processedCount = 0;
let failedCount = 0;

cliLogsEvents.on('completed', () => {
  processedCount++;
  // Log every 50 completed jobs to avoid spam
  if (processedCount % 50 === 0) {
    console.log(`[CLI-LOGS] ✅ Processed ${processedCount} logs (${failedCount} failed)`);
  }
});

cliLogsEvents.on('failed', ({ jobId, failedReason }) => {
  failedCount++;
  console.error(`[CLI-LOGS] ❌ Job ${jobId} failed:`, failedReason);
});

console.log('[CLI-LOGS] 🚀 Worker initialized with concurrency: 10');
