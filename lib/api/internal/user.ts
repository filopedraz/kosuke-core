import { getUser } from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';

/**
 * Internal API function to get the current user
 * This can be used in server components and API routes
 */
export async function getCurrentUser(): Promise<User | null> {
  return await getUser();
}