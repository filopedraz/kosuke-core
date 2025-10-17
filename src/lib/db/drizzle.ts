import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// This prevents connections growing exponentially during API Route usage
// by maintaining a cached connection across hot reloads in development
const globalForPg = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
};

export const client = globalForPg.pg || postgres(process.env.POSTGRES_URL, { max: 10 });

// In development, preserve the connection between hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPg.pg = client;
}

export const db = drizzle(client, { schema });
