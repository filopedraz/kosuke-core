# Preview Container Cleanup - Implementation Tasks

## Overview

Implement automatic cleanup of inactive preview containers using BullMQ (Redis-backed job queue) with a separate worker process. Inactive sessions are tracked via chat message activity (`lastActivityAt`) and stopped after N minutes of inactivity.

---

## Phase 1: Infrastructure Setup

### Task 1.1: Add Redis to docker-compose.yml (Production)

**Files to modify:** `docker-compose.yml`

Add Redis service before the nextjs service:

```yaml
redis:
  image: redis:7-alpine
  container_name: kosuke_redis
  restart: unless-stopped
  ports:
    - '6379:6379'
  volumes:
    - redis_data:/data
  networks:
    - kosuke_network
  command: redis-server --appendonly yes
```

Add to volumes section:

```yaml
volumes:
  # ... existing volumes ...
  redis_data:
```

### Task 1.2: Add Redis to docker-compose.local.yml (Development)

**Files to modify:** `docker-compose.local.yml`

Add Redis service:

```yaml
redis:
  image: redis:7-alpine
  container_name: kosuke_redis_local
  ports:
    - '6379:6379'
  volumes:
    - redis_data:/data
  networks:
    - kosuke_network
  healthcheck:
    test: ['CMD', 'redis-cli', 'ping']
    interval: 5s
    timeout: 3s
    retries: 5
```

Add to volumes:

```yaml
volumes:
  # ... existing ...
  redis_data:
```

Update nextjs depends_on:

```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
```

### Task 1.3: Update Environment Variables

**Files to modify:** `.env.local`, `.env.prod`

Add these variables to `.env.local`:

```
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Preview Cleanup Configuration
CLEANUP_THRESHOLD_MINUTES=30
CLEANUP_INTERVAL_MS=1800000

# Worker Configuration
WORKER_ENABLED=true
```

For production `.env.prod`:

```
REDIS_URL=redis://redis:6379
CLEANUP_THRESHOLD_MINUTES=30
CLEANUP_INTERVAL_MS=1800000
```

### Task 1.4: Update package.json with BullMQ dependency

**Files to modify:** `package.json`

Add BullMQ (not `bull`) and ensure Redis is available:

```bash
bun add bullmq
```

Note: Don't add `redis` separately - BullMQ handles the Redis connection internally.

---

## Phase 2: Database Changes

### Task 2.1: Add Index on lastActivityAt

**Files to modify:** `src/lib/db/schema.ts`

Update the `chatSessions` table to add an index for performance. Add to the table's indexes config:

```typescript
table => ({
  lastActivityAtIdx: index('idx_chat_sessions_last_activity_at').on(table.lastActivityAt),
});
```

Then generate and run migration:

```bash
bun run db:generate
bun run db:migrate
```

---

## Phase 3: Queue & Worker Infrastructure

### Task 3.1: Create BullMQ Queue Client

**Files to create:** `src/lib/queue/client.ts`

Reference: [kosuke-template queue implementation](https://github.com/Kosuke-Org/kosuke-template)

Factory functions for type-safe queue/worker management with automatic Sentry integration:

```typescript
import * as Sentry from '@sentry/nextjs';
import { Queue, QueueEvents, Worker } from 'bullmq';
import type { WorkerOptions } from 'bullmq';
import { redis } from '@/lib/redis'; // Use your Redis connection

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
      delay: 1000, // Start with 1 second, exponentially increase
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // 7 days in seconds
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 14 * 24 * 60 * 60, // 14 days (keep failures longer for debugging)
      count: 5000, // Keep max 5000 failed jobs
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
  await redis.quit();
}
```

### Task 3.2: Create Queue Config

**Files to create:** `src/lib/queue/config.ts`

```typescript
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
  PREVIEW_CLEANUP: 'preview-cleanup',
  // Add more queues here as needed
} as const;

/**
 * Job names - organized by queue
 */
export const JOB_NAMES = {
  // Preview cleanup jobs
  CLEANUP_INACTIVE: 'cleanup-inactive-previews',
  CLEANUP_INACTIVE_SCHEDULED: 'cleanup-inactive-previews-scheduled',
  // Add more job names here as needed
} as const;
```

### Task 3.3: Create Cleanup Logic

**Files to create:** `src/lib/previews/cleanup.ts`

```typescript
import { db } from '@/lib/db/drizzle';
import { chatSessions } from '@/lib/db/schema';
import { getPreviewService } from '.';
import { lt } from 'drizzle-orm';

/**
 * Clean up inactive preview sessions
 * @param thresholdMinutes - Sessions inactive for longer than this are stopped
 * @returns Number of sessions cleaned up
 */
export async function cleanupInactiveSessions(thresholdMinutes: number = 30) {
  console.log(`[CLEANUP] 🧹 Starting cleanup (threshold: ${thresholdMinutes}min)...`);

  const previewService = getPreviewService();
  const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  // Find all sessions inactive for > threshold
  const inactiveSessions = await db
    .select()
    .from(chatSessions)
    .where(lt(chatSessions.lastActivityAt, cutoffTime));

  console.log(`[CLEANUP] Found ${inactiveSessions.length} inactive sessions`);

  let cleanedCount = 0;

  for (const session of inactiveSessions) {
    try {
      await previewService.stopIfInactive(session.projectId, session.sessionId, thresholdMinutes);
      cleanedCount++;
    } catch (error) {
      console.error(
        `[CLEANUP] ❌ Failed to cleanup session ${session.sessionId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  console.log(`[CLEANUP] ✅ Cleaned up ${cleanedCount}/${inactiveSessions.length} sessions`);
  return cleanedCount;
}
```

### Task 3.4: Create Preview Cleanup Queue

**Files to create:** `src/lib/queue/queues/previews.ts`

```typescript
import { createQueue } from '../client';
import { QUEUE_NAMES, JOB_NAMES } from '../config';

/**
 * Type-safe preview cleanup job data
 */
export interface PreviewCleanupJobData {
  thresholdMinutes?: number;
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
  const intervalMs = parseInt(process.env.CLEANUP_INTERVAL_MS || '1800000', 10);
  const thresholdMinutes = parseInt(process.env.CLEANUP_THRESHOLD_MINUTES || '30', 10);

  await previewQueue.upsertJobScheduler(
    JOB_NAMES.CLEANUP_INACTIVE_SCHEDULED,
    {
      every: intervalMs, // Run every N milliseconds
    },
    {
      data: { thresholdMinutes },
    }
  );

  console.log(
    `[PREVIEW] 📅 Scheduled cleanup to run every ${intervalMs}ms (threshold: ${thresholdMinutes}min)`
  );
}
```

### Task 3.5: Create Preview Cleanup Worker

**Files to create:** `src/lib/queue/workers/previews.ts`

```typescript
import { createWorker, createQueueEvents } from '../client';
import { QUEUE_NAMES, JOB_NAMES } from '../config';
import { cleanupInactiveSessions } from '@/lib/previews/cleanup';
import type { PreviewCleanupJobData } from '../queues/previews';

/**
 * Preview cleanup worker
 * Thin wrapper - only handles worker lifecycle and events
 * Business logic is in cleanupInactiveSessions
 */
export const previewWorker = createWorker<PreviewCleanupJobData>(
  QUEUE_NAMES.PREVIEW_CLEANUP,
  async job => {
    const thresholdMinutes = job.data?.thresholdMinutes || 30;
    return await cleanupInactiveSessions(thresholdMinutes);
  },
  {
    concurrency: 1, // Only one cleanup job at a time
  }
);

/**
 * Queue events for monitoring
 */
const previewEvents = createQueueEvents(QUEUE_NAMES.PREVIEW_CLEANUP);

previewEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[PREVIEW] ✅ Job ${jobId} completed:`, returnvalue);
});

previewEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[PREVIEW] ❌ Job ${jobId} failed:`, failedReason);
});

previewEvents.on('progress', ({ jobId, data }) => {
  console.log(`[PREVIEW] 📊 Job ${jobId} progress:`, data);
});

console.log('[PREVIEW] 🚀 Worker initialized');
```

### Task 3.4: Add Preview Service stopIfInactive Method

**Files to modify:** `src/lib/previews/service.ts`

Add method to `PreviewService` class:

```typescript
async stopIfInactive(
  projectId: string,
  sessionId: string,
  thresholdMinutes: number = 30
): Promise<void> {
  try {
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.projectId, projectId),
          eq(chatSessions.sessionId, sessionId)
        )
      );

    if (!session) {
      console.log(`Session ${sessionId} not found`);
      return;
    }

    // Check if still active
    const now = new Date();
    const inactiveMinutes = (now.getTime() - session.lastActivityAt.getTime()) / (1000 * 60);

    if (inactiveMinutes < thresholdMinutes) {
      console.log(
        `Session ${sessionId} still active (${Math.round(inactiveMinutes)}min inactive)`
      );
      return;
    }

    // Get all containers for this session
    const client = await this.ensureClient();
    const containers = await client.containerList({
      filters: {
        label: [
          `kosuke.project_id=${projectId}`,
          `kosuke.session_id=${sessionId}`,
        ],
      },
    });

    console.log(
      `Stopping ${containers.length} containers for inactive session ${sessionId}`
    );

    for (const container of containers) {
      try {
        await client.containerStop(container.Id);
        console.log(`✅ Stopped container ${container.Id.substring(0, 12)}`);
      } catch (error) {
        console.error(
          `Failed to stop container ${container.Id.substring(0, 12)}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  } catch (error) {
    console.error('Error in stopIfInactive:', error);
    throw error;
  }
}
```

Add import at top of file:

```typescript
import { db } from '@/lib/db/drizzle';
import { chatSessions } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
```

---

## Phase 4: Update Chat Message Handler to Track Activity

### Task 4.1: Add lastActivityAt Update to POST Handler

**Files to modify:** `src/app/api/projects/[id]/chat-sessions/[sessionId]/route.ts`

**Note:** The PUT handler already updates `lastActivityAt`, but the POST handler (where messages are sent) does NOT. Add it here.

After saving the user message, add:

```typescript
// Update session's lastActivityAt to track activity for cleanup
await db
  .update(chatSessions)
  .set({ lastActivityAt: new Date() })
  .where(eq(chatSessions.id, chatSession.id));
```

This ensures every message creation updates the session's activity timestamp for the cleanup job.

---

## Phase 5: Worker Process Setup

### Task 5.1: Create Worker Entry Point

**Files to create:** `src/worker.ts`

```typescript
/**
 * Standalone BullMQ Worker Process
 *
 * This file runs as a separate process/container dedicated to processing background jobs.
 * Separating workers from the web server allows independent scaling and better resource isolation.
 *
 * Usage:
 *   - Development: bun run workers:dev
 *   - Production: bun run workers:start
 */

import { gracefulShutdown, previewQueue, previewWorker, schedulePreviewCleanup } from './lib/queue';

async function main() {
  console.log('[WORKER] 🚀 Starting BullMQ worker process...\n');

  try {
    // Schedule all recurring jobs (idempotent - safe to call multiple times)
    await schedulePreviewCleanup();

    console.log('[WORKER] ✅ Worker process initialized and ready');
    console.log('[WORKER] 📊 Active workers:');
    console.log('[WORKER]   - Preview Cleanup (concurrency: 1)\n');

    // Store references for graceful shutdown
    const workers = [previewWorker];
    const queues = [previewQueue];

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      console.log('[WORKER] 📛 Received SIGTERM, shutting down gracefully...');
      await gracefulShutdown(workers, queues);
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[WORKER] 📛 Received SIGINT, shutting down gracefully...');
      await gracefulShutdown(workers, queues);
      process.exit(0);
    });
  } catch (error) {
    console.error('[WORKER] ❌ Failed to start worker:', error);
    process.exit(1);
  }
}

main();
```

### Task 5.2: Update docker-compose.yml for Worker Service

**Files to modify:** `docker-compose.yml`

Add worker service after nextjs service:

```yaml
worker:
  image: ghcr.io/kosuke-org/kosuke-core:latest
  container_name: kosuke_worker
  env_file:
    - .env
  command: node dist/worker.js
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  networks:
    - kosuke_network
  depends_on:
    - redis
    - postgres
  restart: unless-stopped
```

### Task 5.3: Update docker-compose.local.yml for Worker Service

**Files to modify:** `docker-compose.local.yml`

Add worker service:

```yaml
worker:
  build:
    context: .
    dockerfile: Dockerfile.local
  container_name: kosuke_worker_local
  command: bun run worker
  volumes:
    - .:/app:cached
    - /app/node_modules
    - /app/.next
    - /var/run/docker.sock:/var/run/docker.sock
  env_file:
    - .env
  depends_on:
    redis:
      condition: service_healthy
    postgres:
      condition: service_healthy
  networks:
    - kosuke_network
  restart: unless-stopped
```

### Task 5.4: Add Worker Scripts to package.json

**Files to modify:** `package.json`

Add to scripts section:

```json
  "workers:start": "node dist/worker.js",
  "workers:dev": "tsx watch src/worker.ts"
```

The `dist/worker.js` is the compiled output when you build the app. For development, use `tsx watch` to watch and reload on changes.

---

## Phase 6: Next.js App Initialization

### Task 6.1: Initialize Queue in Next.js App

**Files to modify:** `src/app/layout.tsx` or create `src/lib/queue/init-workers.ts`

Create `src/lib/queue/init-workers.ts` for initialization on app startup:

```typescript
/**
 * Run this to start all BullMQ workers
 * Called automatically from the Next.js app when deployed
 * Can also be run as standalone: bun run workers:dev
 */

import { gracefulShutdown, scheduleAllJobs, previewQueue, previewWorker } from './index';

console.log('🚀 Starting BullMQ workers...');

// Schedule all recurring jobs (idempotent)
scheduleAllJobs()
  .then(() => {
    console.log('✅ Recurring jobs scheduled');
  })
  .catch(error => {
    console.error('❌ Failed to schedule recurring jobs:', error);
  });

// List of all workers
const workers = [previewWorker];
const queues = [previewQueue];

console.log(`✅ ${workers.length} worker(s) initialized and running`);

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  await gracefulShutdown(workers, queues);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT received, shutting down gracefully...');
  await gracefulShutdown(workers, queues);
  process.exit(0);
});

// Keep the process alive
process.stdin.resume();
```

Then create a re-export in `src/lib/queue/index.ts`:

```typescript
/**
 * BullMQ Queue Module
 * Re-exports all queue, worker, and utility exports for convenience
 */

export { createQueue, createWorker, createQueueEvents, gracefulShutdown } from './client';
export { QUEUE_NAMES, JOB_NAMES } from './config';
export { previewQueue, schedulePreviewCleanup } from './queues/previews';
export { previewWorker } from './workers/previews';

export async function scheduleAllJobs() {
  const { schedulePreviewCleanup } = await import('./queues/previews');
  await schedulePreviewCleanup();
}
```

Then import in `src/app/layout.tsx` (server-side only):

```typescript
// At the top of your root layout
import '@/lib/queue/init-workers'; // Initialize workers on app startup (server-side only)
```

---

## Phase 7: Testing & Verification

### Task 7.1: Local Testing with 5-Minute Threshold

**Files to modify:** `.env.local`

Update for testing:

```
CLEANUP_THRESHOLD_MINUTES=5
CLEANUP_INTERVAL_MS=120000
```

### Task 7.2: Test Checklist

- [ ] Start containers: `docker compose -f docker-compose.local.yml up`
- [ ] Verify Redis is running: `redis-cli ping` → should return `PONG`
- [ ] Create a new chat session
- [ ] Send a message
- [ ] Check database: `chatSessions.lastActivityAt` should update to current time
- [ ] Wait 5+ minutes without sending messages
- [ ] Verify containers are stopped via: `docker ps | grep kosuke-preview`
- [ ] Open preview panel again - containers should auto-restart

### Task 7.3: Production Deployment Steps

- [ ] Merge to main branch
- [ ] Build new Docker image: `docker build -t ghcr.io/kosuke-org/kosuke-core:latest .`
- [ ] Update docker-compose.yml to use new image
- [ ] Set `CLEANUP_THRESHOLD_MINUTES=30` in production .env
- [ ] Deploy: `docker compose -f docker-compose.yml up -d`
- [ ] Verify Redis is accessible: `redis-cli -h redis ping`
- [ ] Check worker logs: `docker logs kosuke_worker`
- [ ] Monitor cleanup job execution for 24 hours

---

## Files Summary

### New Files Created

- `src/lib/queue/client.ts` - Factory functions for queues, workers, events with Sentry integration
- `src/lib/queue/config.ts` - Centralized queue and job name constants
- `src/lib/queue/queues/previews.ts` - Preview cleanup queue definition and scheduling
- `src/lib/queue/workers/previews.ts` - Preview cleanup worker with event monitoring
- `src/lib/queue/init-workers.ts` - Worker initialization script
- `src/lib/queue/index.ts` - Barrel export for convenience
- `src/lib/previews/cleanup.ts` - Cleanup business logic
- `src/worker.ts` - Standalone worker entry point

### Files Modified

- `docker-compose.yml` - Add Redis service + worker service
- `docker-compose.local.yml` - Add Redis service + worker service
- `.env.local` - Add Redis + cleanup config
- `.env.prod` - Add Redis + cleanup config
- `package.json` - Add `bullmq` dependency + worker scripts
- `src/app/layout.tsx` - Import `@/lib/queue/init-workers` to initialize on startup
- `src/lib/previews/service.ts` - Add stopIfInactive() method
- `src/app/api/projects/[id]/chat-sessions/[sessionId]/route.ts` - Update lastActivityAt on message creation

### Database Changes

- Create migration: Add index on `chatSessions.lastActivityAt`

---

## Verification Commands

```bash
# Check Redis connection
redis-cli ping

# Check queue jobs
redis-cli
> LRANGE bull:preview-cleanup:* 0 -1

# Monitor worker logs
docker logs -f kosuke_worker

# Check active containers
docker ps --filter "label=kosuke.type"
```

---

## Implementation Pattern - Kosuke Template

This implementation follows the kosuke-template BullMQ pattern for production-ready reliability:

✅ **Factory Functions** - `createQueue()`, `createWorker()`, `createQueueEvents()` for reusability
✅ **Sentry Integration** - Automatic error tracking in worker processor + worker-level errors
✅ **Type Safety** - Full TypeScript generics for type-safe job data
✅ **Graceful Shutdown** - Proper SIGTERM/SIGINT handling with resource cleanup
✅ **Queue Events** - Monitor job completion, failures, and progress
✅ **Retry Logic** - Exponential backoff with 3 automatic retries
✅ **Job Cleanup** - Completed jobs kept 7 days, failed jobs 14 days for debugging
✅ **Separation of Concerns** - Config → Client → Queues → Workers → Jobs

## Key Improvements Over Initial Plan

✅ **Removed:** `scheduleCleanupJob()` - Replaced with `upsertJobScheduler()` for safety
✅ **Improved:** Separated queue config from client logic
✅ **Improved:** Worker is thin wrapper - business logic in cleanup module
✅ **Improved:** Built-in Sentry integration for error tracking
✅ **Improved:** Consistent logging across all workers with `[WORKER]` prefix
✅ **Simplified:** Activity tracking via existing chat message creation (no heartbeat needed)
⚠️ **Trade-off:** Containers stop if user opens preview but doesn't send messages for threshold duration
