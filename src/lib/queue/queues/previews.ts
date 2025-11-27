import { createQueue } from '../client';
import { JOB_NAMES, QUEUE_NAMES } from '../config';

/**
 * Type-safe preview cleanup job data
 */
export interface PreviewCleanupJobData {
  thresholdMinutes: number;
}

/**
 * Preview cleanup queue instance
 */
export const previewQueue = createQueue<PreviewCleanupJobData>(QUEUE_NAMES.PREVIEW_CLEANUP);

/**
 * Schedule the recurring cleanup job
 * Safe to call multiple times (uses upsertJobScheduler)
 */
export async function schedulePreviewCleanup() {
  const thresholdMinutes = parseInt(process.env.CLEANUP_THRESHOLD_MINUTES || '30', 10);
  const intervalMs = parseInt(process.env.CLEANUP_INTERVAL_MS || String(30 * 60 * 1000), 10);

  await previewQueue.upsertJobScheduler(
    JOB_NAMES.CLEANUP_INACTIVE_PREVIEWS,
    {
      every: intervalMs,
    },
    {
      data: { thresholdMinutes },
    }
  );

  console.log(
    `[PREVIEW] 📅 Scheduled cleanup to run every ${intervalMs}ms (threshold: ${thresholdMinutes}min)`
  );
}
