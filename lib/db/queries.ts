import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import type { Diff } from '@/lib/db/schema';
import { activityLogs, chatMessages, diffs, projects, users } from '@/lib/db/schema';

/**
 * Get current authenticated user with soft delete check
 */
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

/**
 * Get activity logs with user details
 */
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

/**
 * Get chat messages with user details (complex join)
 */
export async function getChatMessagesWithUserDetails(projectId: number, limit: number = 50) {
  return db
    .select({
      message: chatMessages,
      userName: users.name,
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.userId, users.clerkUserId))
    .where(eq(chatMessages.projectId, projectId))
    .orderBy(asc(chatMessages.timestamp))
    .limit(limit);
}

/**
 * Get diffs with chat message details (complex join)
 */
export async function getDiffsWithChatDetails(projectId: number) {
  return db
    .select({
      diff: diffs,
      messageContent: chatMessages.content,
      messageRole: chatMessages.role,
    })
    .from(diffs)
    .leftJoin(chatMessages, eq(diffs.chatMessageId, chatMessages.id))
    .where(eq(diffs.projectId, projectId))
    .orderBy(desc(diffs.createdAt));
}

/**
 * Update diff status with business logic
 */
export async function updateDiffStatus(
  id: number,
  status: 'pending' | 'applied' | 'rejected',
  appliedAt?: Date
): Promise<Diff | undefined> {
  const updateData: Partial<Diff> = { status };

  if (status === 'applied' && appliedAt) {
    updateData.appliedAt = appliedAt;
  }

  const [updatedDiff] = await db.update(diffs).set(updateData).where(eq(diffs.id, id)).returning();

  return updatedDiff;
}

/**
 * Get project with GitHub and user details (complex join)
 */
export async function getProjectWithDetails(id: number) {
  return db
    .select({
      project: projects,
      creatorName: users.name,
    })
    .from(projects)
    .leftJoin(users, eq(projects.createdBy, users.clerkUserId))
    .where(eq(projects.id, id))
    .limit(1);
}
