import { db } from '@/lib/db/drizzle';
import { chatSessions } from '@/lib/db/schema';
import { lt } from 'drizzle-orm';
import { getPreviewService } from '.';

/**
 * Clean up inactive preview sessions
 * @param thresholdMinutes - Sessions inactive for longer than this are stopped
 * @returns Number of sessions cleaned up
 */
export async function cleanupInactiveSessions(thresholdMinutes: number) {
  console.log(`[CLEANUP] 🧹 Starting cleanup (threshold: ${thresholdMinutes}min)...`);

  const previewService = getPreviewService();
  const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  // Find all sessions inactive for > threshold
  const inactiveSessions = await db
    .select()
    .from(chatSessions)
    .where(lt(chatSessions.lastActivityAt, cutoffTime));

  console.log(`[CLEANUP] Found ${inactiveSessions.length} inactive sessions`);

  let cleanedCount = 0;

  for (const session of inactiveSessions) {
    try {
      await previewService.stopPreview(session.projectId, session.sessionId);
      cleanedCount++;
    } catch (error) {
      console.error(
        `[CLEANUP] ❌ Failed to cleanup session ${session.sessionId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  console.log(`[CLEANUP] ✅ Cleaned up ${cleanedCount}/${inactiveSessions.length} sessions`);
  return cleanedCount;
}
