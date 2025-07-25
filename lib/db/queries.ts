import { desc, and, eq, isNull } from 'drizzle-orm';
import { auth, currentUser } from '@clerk/nextjs';

import { db } from '@/lib/db/drizzle';
import { activityLogs, users } from '@/lib/db/schema';

export async function getUser() {
  const { userId } = auth();
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  // Return Clerk user data in expected format
  return {
    id: clerkUser.id,
    name: clerkUser.firstName && clerkUser.lastName 
      ? `${clerkUser.firstName} ${clerkUser.lastName}` 
      : clerkUser.firstName || null,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    imageUrl: clerkUser.imageUrl || null,
    role: 'member', // Default role, can be customized based on Clerk metadata
    createdAt: new Date(clerkUser.createdAt),
    updatedAt: new Date(clerkUser.updatedAt || clerkUser.createdAt),
  };
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Note: This will need to be updated when activity logs are implemented with Clerk user IDs
  // For now, returning empty array since the current activity logs table uses numeric user IDs
  return [];
}
