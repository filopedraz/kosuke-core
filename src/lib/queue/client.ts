import * as Sentry from '@sentry/nextjs';
import { Queue, QueueEvents, Worker } from 'bullmq';
import type { WorkerOptions } from 'bullmq';

import { closeRedis, redis } from '@/lib/redis';

/**
 * Default queue options for consistent behavior across all queues
 * @internal - Used internally by createQueue factory
 */
const defaultQueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential' as const,
      delay: 1000, // Start with 1 second delay, exponentially increase
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // 7 days in seconds
      count: 1000, // Keep maximum 1000 completed jobs
    },
    removeOnFail: {
      age: 14 * 24 * 60 * 60, // 14 days in seconds (keep failures longer for debugging)
      count: 5000, // Keep maximum 5000 failed jobs
    },
  },
};

/**
 * Default worker options for consistent error handling and concurrency
 * @internal - Used internally by createWorker factory
 */
const defaultWorkerOptions = {
  connection: redis,
  concurrency: 5, // Process 5 jobs concurrently
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

/**
 * Type-safe queue creation helper
 */
export function createQueue<T = unknown>(name: string) {
  return new Queue<T>(name, defaultQueueOptions);
}

/**
 * Type-safe worker creation helper with centralized error handling
 */
export function createWorker<T = unknown>(
  name: string,
  processor: (job: { data: T; id?: string }) => Promise<unknown>,
  options?: Partial<WorkerOptions>
) {
  const worker = new Worker<T>(
    name,
    async job => {
      try {
        console.log(`[WORKER] 🔄 Processing job: ${job.id}`);
        const result = await processor(job);
        console.log(`[WORKER] ✅ Job ${job.id} completed`);
        return result;
      } catch (error) {
        console.error(`[WORKER] ❌ Job ${job.id} failed:`, error);

        // Report to Sentry with context
        Sentry.captureException(error, {
          tags: {
            jobId: job.id,
            queueName: name,
          },
          extra: {
            jobData: job.data,
            attemptsMade: job.attemptsMade,
          },
        });

        throw error; // Re-throw to mark job as failed and trigger retry
      }
    },
    { ...defaultWorkerOptions, ...options }
  );

  // Worker-level error handler for critical errors
  worker.on('error', error => {
    console.error(`[WORKER] 🚨 Worker error on ${name}:`, error);
    Sentry.captureException(error, {
      tags: {
        component: 'worker',
        queueName: name,
      },
    });
  });

  return worker;
}

/**
 * Create queue events listener for monitoring
 */
export function createQueueEvents(name: string) {
  return new QueueEvents(name, {
    connection: redis,
  });
}

/**
 * Graceful shutdown handler for workers and Redis connection
 * Call this when shutting down the application to ensure jobs are completed
 */
export async function gracefulShutdown(workers: Worker[], queues: Queue[] = []) {
  console.log('[WORKER] 🛑 Gracefully shutting down workers and queues...');

  // Close all workers first (stops accepting new jobs)
  await Promise.all(
    workers.map(async worker => {
      console.log(`[WORKER] 📛 Closing worker: ${worker.name}`);
      await worker.close();
    })
  );

  // Close all queues (closes Redis connections)
  await Promise.all(
    queues.map(async queue => {
      console.log(`[WORKER] 📛 Closing queue: ${queue.name}`);
      await queue.close();
    })
  );

  console.log('[WORKER] ✅ All workers and queues shut down successfully');

  // Close Redis connection after workers are closed
  await closeRedis();
}
