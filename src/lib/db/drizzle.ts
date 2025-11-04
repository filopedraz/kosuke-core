import dotenv from 'dotenv';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

dotenv.config();

// This prevents connections growing exponentially during API Route usage
// by maintaining a cached connection across hot reloads in development
const globalForPg = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
  db: PostgresJsDatabase<typeof schema> | undefined;
};

function getClient() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  if (globalForPg.pg) {
    return globalForPg.pg;
  }

  const client = postgres(process.env.POSTGRES_URL, { max: 10 });

  // In development, preserve the connection between hot reloads
  if (process.env.NODE_ENV !== 'production') {
    globalForPg.pg = client;
  }

  return client;
}

function getDb() {
  if (globalForPg.db) {
    return globalForPg.db;
  }

  const client = getClient();
  const db = drizzle(client, { schema });

  // Cache the db instance
  if (process.env.NODE_ENV !== 'production') {
    globalForPg.db = db;
  }

  return db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get: (_target, prop) => {
    const dbInstance = getDb();
    return dbInstance[prop as keyof typeof dbInstance];
  },
}) as PostgresJsDatabase<typeof schema>;
