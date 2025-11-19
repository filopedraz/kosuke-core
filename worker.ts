/**
 * Standalone BullMQ Worker Process
 *
 * This file runs as a separate process/container dedicated to processing background jobs.
 * Separating workers from the web server allows independent scaling and resource isolation.
 *
 * Usage:
 *   - Development: bun run workers:dev
 *   - Production: bun run workers:start
 */
import { gracefulShutdown, cliLogsQueue, cliLogsWorker } from './src/lib/queue';

async function main() {
  console.log('[WORKER] 🚀 Starting BullMQ worker process...\n');

  try {
    console.log('[WORKER] ✅ Worker process initialized and ready');
    console.log('[WORKER] 📊 Active workers:');
    console.log('[WORKER]   - CLI Logs (concurrency: 10)\n');

    // Store references for graceful shutdown
    const workers = [cliLogsWorker];
    const queues = [cliLogsQueue];

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
