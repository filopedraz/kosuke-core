import dotenv from 'dotenv';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

dotenv.config({ quiet: true });

// POSTGRES_URL is validated at runtime startup via instrumentation.ts

// Define the database type with schema
type DrizzleDB = PostgresJsDatabase<typeof schema>;

// This prevents connections growing exponentially during API Route usage
// by maintaining a cached connection across hot reloads in development
const globalForDb = globalThis as unknown as {
  db: DrizzleDB | undefined;
};

/**
 * Lazy initialization of database client
 * Only creates the connection when first accessed, avoiding build-time initialization
 */
function getDb(): DrizzleDB {
  if (!globalForDb.db) {
    const client = postgres(process.env.POSTGRES_URL!, { max: 10 });
    globalForDb.db = drizzle(client, { schema });
  }

  return globalForDb.db;
}

export const db = new Proxy({} as DrizzleDB, {
  get: (_target, prop) => {
    const dbInstance = getDb();
    return dbInstance[prop as keyof DrizzleDB];
  },
}) as DrizzleDB;
