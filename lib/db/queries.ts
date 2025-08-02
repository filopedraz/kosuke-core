import { and, desc, eq, isNull } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { activityLogs, users } from '@/lib/db/schema';

export async function getUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.clerkUserId, userId), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getActivityLogs() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.clerkUserId))
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}
