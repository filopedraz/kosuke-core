/**
 * BullMQ Queue Module
 * Re-exports all queue, worker, and utility exports for convenience
 */

export { createQueue, createQueueEvents, createWorker, gracefulShutdown } from './client';
export { JOB_NAMES, QUEUE_NAMES } from './config';
export { previewQueue, schedulePreviewCleanup } from './queues/previews';
export { previewWorker } from './workers/previews';

export async function scheduleAllJobs() {
  const { schedulePreviewCleanup } = await import('./queues/previews');
  await schedulePreviewCleanup();
}
