import { Redis } from 'ioredis';

/**
 * Lazy-initialized shared Redis connection instance
 * Used by BullMQ for job queue management
 * Only connects when first accessed, not on module import
 */
let redisInstance: Redis | null = null;

/**
 * Get or create the shared Redis connection
 * Lazy initialization ensures connection only happens when needed
 */
export function getRedis(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  redisInstance = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false, // Required for some operations
    retryStrategy: times => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: err => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  redisInstance.on('error', err => {
    console.error('[REDIS] ❌ Connection error:', err);
  });

  redisInstance.on('connect', () => {
    console.log('[REDIS] ✅ Connected');
  });

  redisInstance.on('close', () => {
    console.log('[REDIS] 🔌 Disconnected');
  });

  return redisInstance;
}
