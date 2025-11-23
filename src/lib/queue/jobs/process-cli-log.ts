import { db } from '@/lib/db/drizzle';
import { cliLogs } from '@/lib/db/schema';

import type { CliLogJobData } from '../queues/cli-logs';

/**
 * CLI Log Job Processor
 *
 * Pure business logic - inserts CLI log into database.
 */
export async function processCliLog(data: CliLogJobData): Promise<{
  success: boolean;
  logId: string;
}> {
  console.log('[JOB] 🔄 Processing CLI log:', {
    command: data.command,
    projectId: data.projectId,
    status: data.status,
  });

  try {
    const [inserted] = await db
      .insert(cliLogs)
      .values({
        projectId: data.projectId,
        orgId: data.orgId,
        userId: data.userId,
        command: data.command,
        commandArgs: data.commandArgs,
        status: data.status,
        errorMessage: data.errorMessage,
        tokensInput: data.tokensInput,
        tokensOutput: data.tokensOutput,
        tokensCacheCreation: data.tokensCacheCreation ?? 0,
        tokensCacheRead: data.tokensCacheRead ?? 0,
        cost: data.cost,
        executionTimeMs: data.executionTimeMs,
        inferenceTimeMs: data.inferenceTimeMs,
        fixesApplied: data.fixesApplied,
        testsRun: data.testsRun,
        testsPassed: data.testsPassed,
        testsFailed: data.testsFailed,
        iterations: data.iterations,
        filesModified: data.filesModified,
        conversationMessages: data.conversationMessages,
        cliVersion: data.cliVersion,
        metadata: data.metadata,
        startedAt: new Date(data.startedAt),
        completedAt: new Date(data.completedAt),
      })
      .returning({ id: cliLogs.id });

    console.log('[JOB] ✅ CLI log processed successfully:', inserted.id);

    return {
      success: true,
      logId: inserted.id,
    };
  } catch (error) {
    console.error('[JOB] ❌ Error processing CLI log:', error);
    throw error; // Re-throw for BullMQ retry logic
  }
}
