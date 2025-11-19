import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

/**
 * Create Redis connection instance
 * Uses IORedis for high-performance Redis client
 * @internal - Used internally by queue/worker factories
 */
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    if (times > 4) {
      console.error('[redis] max retries reached');
      return null;
    }

    // otherwise wait a bit before next retry
    const delay = Math.min(times * 200, 2000);
    console.warn(`[redis] reconnecting in ${delay}ms...`);
    return delay;
  },
});

async function closeRedis() {
  try {
    console.log('[redis] shutting down...');
    await redis.quit();
  } catch (err) {
    console.error('[redis] error during shutdown:', err);
  }
}

redis.on('connect', () => {
  console.log('[redis] connected');
});

redis.on('ready', () => {
  console.log('[redis] ready');
});

redis.on('error', err => {
  console.error('[redis] connection error:', err);
});

redis.on('reconnecting', () => {
  console.warn('[redis] reconnecting...');
});

process.on('SIGTERM', async () => {
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeRedis();
  process.exit(0);
});

export { redis, closeRedis };
