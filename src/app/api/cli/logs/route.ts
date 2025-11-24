import { NextResponse } from 'next/server';
import { z } from 'zod';

import { addCliLogJob } from '@/lib/queue';

/**
 * Zod schema for CLI log request validation
 */
const cliLogSchema = z.object({
  // Project context (required - only log if within kosuke-core project)
  projectId: z.string().uuid(),
  orgId: z.string().optional(),
  userId: z.string().optional(),

  // Command details
  command: z.enum(['ship', 'test', 'review', 'getcode', 'tickets']),
  commandArgs: z.record(z.string(), z.unknown()).optional(),

  // Execution status
  status: z.enum(['success', 'error', 'cancelled']),
  errorMessage: z.string().optional(),

  // Token usage
  tokensInput: z.number().int().min(0),
  tokensOutput: z.number().int().min(0),
  tokensCacheCreation: z.number().int().min(0).optional(),
  tokensCacheRead: z.number().int().min(0).optional(),
  cost: z.string(), // Decimal as string to avoid precision issues

  // Performance
  executionTimeMs: z.number().int().min(0),
  inferenceTimeMs: z.number().int().min(0).optional(),

  // Command results
  fixesApplied: z.number().int().min(0).optional(),
  testsRun: z.number().int().min(0).optional(),
  testsPassed: z.number().int().min(0).optional(),
  testsFailed: z.number().int().min(0).optional(),
  iterations: z.number().int().min(0).optional(),
  filesModified: z.array(z.string()).optional(),

  // Metadata
  cliVersion: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),

  // Conversation Data (full capture for tickets/requirements commands)
  conversationMessages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string().datetime(),
        toolCalls: z
          .array(
            z.object({
              name: z.string(),
              input: z.any(),
              output: z.any().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),

  // Timestamps
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
});

/**
 * POST /api/cli/logs
 * Endpoint for kosuke-cli to log command executions
 * Uses BullMQ queue for async processing
 */
export async function POST(request: Request) {
  try {
    // Verify API key from CLI
    const apiKey = request.headers.get('x-cli-api-key');
    const expectedKey = process.env.KOSUKE_CLI_API_KEY;

    if (!expectedKey) {
      console.error('[API /cli/logs] KOSUKE_CLI_API_KEY not configured');
      return new NextResponse(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!apiKey || apiKey !== expectedKey) {
      console.warn('[API /cli/logs] Invalid API key attempt');
      return new NextResponse(JSON.stringify({ error: 'Invalid API key' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = cliLogSchema.parse(body);

    // Queue log for async processing (non-blocking)
    const job = await addCliLogJob(validatedData);

    console.log(
      `[API /cli/logs] ✅ Queued log for project ${validatedData.projectId}: ${validatedData.command}`
    );

    return new NextResponse(
      JSON.stringify({
        success: true,
        jobId: job.id,
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } } // 202 Accepted - queued for processing
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[API /cli/logs] Validation error:', error.issues);
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid request data',
          details: error.issues,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('[API /cli/logs] Error queueing log:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to queue log request',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
