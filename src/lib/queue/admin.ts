/**
 * Queue Admin Utilities
 *
 * Utilities for monitoring and managing BullMQ queues.
 * Automatically discovers all queues defined in the application.
 */

import type { Queue, Job } from 'bullmq';
import { cliLogsQueue } from './queues/cli-logs';
import { QUEUE_NAMES } from './config';
import type { QueueMetrics, JobSummary, RepeatableJob } from '@/lib/types/jobs';

/**
 * Get all available queues
 * Add new queues here as they are created
 */
function getAllQueues(): Array<{ name: string; queue: Queue }> {
  return [{ name: QUEUE_NAMES.CLI_LOGS, queue: cliLogsQueue }];
}

/**
 * Get queue by name
 */
function getQueueByName(name: string): Queue | null {
  const queue = getAllQueues().find(q => q.name === name);
  return queue?.queue ?? null;
}

/**
 * Get metrics for all queues
 */
export async function getAllQueueMetrics(): Promise<QueueMetrics[]> {
  const queues = getAllQueues();

  const metrics = await Promise.all(
    queues.map(async ({ name, queue }) => {
      const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);

      return {
        name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: isPaused,
      };
    })
  );

  return metrics;
}

/**
 * Get metrics for a specific queue
 */
// TODO: Uncomment when needed
// export async function getQueueMetrics(queueName: string): Promise<QueueMetrics | null> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return null;

//   const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
//     queue.getWaitingCount(),
//     queue.getActiveCount(),
//     queue.getCompletedCount(),
//     queue.getFailedCount(),
//     queue.getDelayedCount(),
//     queue.isPaused(),
//   ]);

//   return {
//     name: queueName,
//     waiting,
//     active,
//     completed,
//     failed,
//     delayed,
//     paused: isPaused,
//   };
// }

/**
 * Get all scheduled repeatable jobs across all queues
 */
export async function getAllRepeatableJobs(): Promise<RepeatableJob[]> {
  const queues = getAllQueues();

  const allJobs = await Promise.all(
    queues.map(async ({ name, queue }) => {
      const jobs = await queue.getRepeatableJobs();
      return jobs.map(job => ({
        key: job.key,
        name: job.name ?? 'unknown',
        queueName: name,
        pattern: job.pattern ?? 'unknown',
        next: job.next,
        tz: job.tz,
      }));
    })
  );

  return allJobs.flat();
}

/**
 * Get scheduled jobs for a specific queue
 */
// TODO: Uncomment when needed
// export async function getRepeatableJobsForQueue(queueName: string): Promise<RepeatableJob[]> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return [];

//   const jobs = await queue.getRepeatableJobs();
//   return jobs.map(job => ({
//     key: job.key,
//     name: job.name ?? 'unknown',
//     queueName,
//     pattern: job.pattern ?? 'unknown',
//     next: job.next,
//     tz: job.tz,
//   }));
// }

/**
 * Get all active (running) jobs across all queues
 */
export async function getAllActiveJobs(): Promise<JobSummary[]> {
  const queues = getAllQueues();

  const allJobs = await Promise.all(
    queues.map(async ({ name, queue }) => {
      const jobs = await queue.getActive();
      return jobs.map(job => jobToSummary(job, name));
    })
  );

  return allJobs.flat();
}

/**
 * Get active jobs for a specific queue
 */
// TODO: Uncomment when needed
// export async function getActiveJobsForQueue(queueName: string): Promise<JobSummary[]> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return [];

//   const jobs = await queue.getActive();
//   return jobs.map(job => jobToSummary(job, queueName));
// }

/**
 * Get completed jobs with pagination and optional search
 */
export async function getCompletedJobs(
  queueName: string,
  start = 0,
  end = 49,
  search?: string
): Promise<JobSummary[]> {
  const queue = getQueueByName(queueName);
  if (!queue) return [];

  const jobs = await queue.getCompleted(start, end);
  let jobSummaries = jobs.map(job => jobToSummary(job, queueName));

  // Apply search filter if provided
  if (search) {
    const searchLower = search.toLowerCase();
    jobSummaries = jobSummaries.filter(
      job =>
        job.name.toLowerCase().includes(searchLower) ||
        job.id.toLowerCase().includes(searchLower) ||
        JSON.stringify(job.data).toLowerCase().includes(searchLower)
    );
  }

  return jobSummaries;
}

/**
 * Get failed jobs with pagination and optional search
 */
export async function getFailedJobs(
  queueName: string,
  start = 0,
  end = 49,
  search?: string
): Promise<JobSummary[]> {
  const queue = getQueueByName(queueName);
  if (!queue) return [];

  const jobs = await queue.getFailed(start, end);
  let jobSummaries = jobs.map(job => jobToSummary(job, queueName));

  // Apply search filter if provided
  if (search) {
    const searchLower = search.toLowerCase();
    jobSummaries = jobSummaries.filter(
      job =>
        job.name.toLowerCase().includes(searchLower) ||
        job.id.toLowerCase().includes(searchLower) ||
        job.failedReason?.toLowerCase().includes(searchLower) ||
        JSON.stringify(job.data).toLowerCase().includes(searchLower)
    );
  }

  return jobSummaries;
}

/**
 * Get waiting jobs with optional search
 */
export async function getWaitingJobs(queueName: string, search?: string): Promise<JobSummary[]> {
  const queue = getQueueByName(queueName);
  if (!queue) return [];

  const jobs = await queue.getWaiting();
  let jobSummaries = jobs.map(job => jobToSummary(job, queueName));

  // Apply search filter if provided
  if (search) {
    const searchLower = search.toLowerCase();
    jobSummaries = jobSummaries.filter(
      job =>
        job.name.toLowerCase().includes(searchLower) ||
        job.id.toLowerCase().includes(searchLower) ||
        JSON.stringify(job.data).toLowerCase().includes(searchLower)
    );
  }

  return jobSummaries;
}

/**
 * Get delayed jobs with optional search
 */
export async function getDelayedJobs(queueName: string, search?: string): Promise<JobSummary[]> {
  const queue = getQueueByName(queueName);
  if (!queue) return [];

  const jobs = await queue.getDelayed();
  let jobSummaries = jobs.map(job => jobToSummary(job, queueName));

  // Apply search filter if provided
  if (search) {
    const searchLower = search.toLowerCase();
    jobSummaries = jobSummaries.filter(
      job =>
        job.name.toLowerCase().includes(searchLower) ||
        job.id.toLowerCase().includes(searchLower) ||
        JSON.stringify(job.data).toLowerCase().includes(searchLower)
    );
  }

  return jobSummaries;
}

/**
 * Get job details by ID
 */
// TODO: Uncomment when needed
// export async function getJobById(queueName: string, jobId: string): Promise<JobSummary | null> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return null;

//   const job = await queue.getJob(jobId);
//   if (!job) return null;

//   return jobToSummary(job, queueName);
// }

/**
 * Remove a repeatable job
 */
// TODO: Uncomment when needed
// export async function removeRepeatableJob(queueName: string, jobKey: string): Promise<boolean> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return false;

//   const repeatableJobs = await queue.getRepeatableJobs();
//   const job = repeatableJobs.find(j => j.key === jobKey);

//   if (!job) return false;

//   await queue.removeRepeatableByKey(jobKey);
//   return true;
// }

/**
 * Pause a queue
 */
// TODO: Uncomment when needed
// export async function pauseQueue(queueName: string): Promise<boolean> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return false;

//   await queue.pause();
//   return true;
// }

/**
 * Resume a queue
 */
// TODO: Uncomment when needed
// export async function resumeQueue(queueName: string): Promise<boolean> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return false;

//   await queue.resume();
//   return true;
// }

/**
 * Retry a failed job
 */
// TODO: Uncomment when needed
// export async function retryFailedJob(queueName: string, jobId: string): Promise<boolean> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return false;

//   const job = await queue.getJob(jobId);
//   if (!job) return false;

//   await job.retry();
//   return true;
// }

/**
 * Remove (delete) a job
 */
// TODO: Uncomment when needed
// export async function removeJob(queueName: string, jobId: string): Promise<boolean> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return false;

//   const job = await queue.getJob(jobId);
//   if (!job) return false;

//   await job.remove();
//   return true;
// }

/**
 * Clean old jobs (completed/failed) based on retention policy
 */
// TODO: Uncomment when needed
// export async function cleanQueue(
//   queueName: string,
//   grace: number,
//   limit: number,
//   type: 'completed' | 'failed'
// ): Promise<number> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return 0;

//   const jobs = await queue.clean(grace, limit, type);
//   return jobs.length;
// }

/**
 * Clean old jobs from all queues based on retention policy
 * 7 days for completed, 30 days for failed
 */
// TODO: Uncomment when needed (also uncomment cleanQueue function above)
// export async function cleanAllQueues(): Promise<{ queue: string; cleaned: number }[]> {
//   const queues = getAllQueues();
//   const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
//   const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

//   const results = await Promise.all(
//     queues.map(async ({ name }) => {
//       const completedCleaned = await cleanQueue(name, SEVEN_DAYS_MS, 1000, 'completed');
//       const failedCleaned = await cleanQueue(name, THIRTY_DAYS_MS, 1000, 'failed');

//       return {
//         queue: name,
//         cleaned: completedCleaned + failedCleaned,
//       };
//     })
//   );

//   return results;
// }

/**
 * Add a job to a queue manually
 */
// TODO: Uncomment when needed
// export async function addJobToQueue(
//   queueName: string,
//   jobName: string,
//   data: Record<string, unknown>
// ): Promise<string | null> {
//   const queue = getQueueByName(queueName);
//   if (!queue) return null;

//   const job = await queue.add(jobName, data, {
//     removeOnComplete: true,
//     removeOnFail: false,
//   });

//   return job.id ?? null;
// }

/**
 * Convert BullMQ Job to JobSummary
 */
function jobToSummary(job: Job, queueName: string): JobSummary {
  // Filter progress to only include number or object types
  const progress =
    typeof job.progress === 'number' || typeof job.progress === 'object' ? job.progress : undefined;

  return {
    id: job.id ?? 'unknown',
    name: job.name,
    queueName,
    data: job.data as Record<string, unknown>,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
    returnvalue: job.returnvalue,
    progress,
    attemptsMade: job.attemptsMade,
    stacktrace: job.stacktrace,
  };
}
