import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { applyColorPalette } from '@/lib/branding';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Apply a color palette to the session's globals.css file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return ApiErrorHandler.invalidProjectId();
    }

    if (!sessionId) {
      return ApiErrorHandler.badRequest('Session ID is required');
    }

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || project.userId !== userId) {
      return ApiErrorHandler.projectNotFound();
    }

    const requestBody = await request.json();
    // Extract request body
    const colors = requestBody.colors;
    if (!colors || !Array.isArray(colors) || colors.length === 0) {
      return ApiErrorHandler.badRequest('Colors array is required and must not be empty');
    }

    console.log(`🎨 Color palette application request for project ${projectId}, session ${sessionId}`);
    console.log(`📊 Colors to apply: ${colors}`);

    // Apply colors to globals.css
    const result = await applyColorPalette(projectId, sessionId, colors);

    console.log(`✅ Color palette application ${result.success ? 'successful' : 'failed'}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in apply-palette API:', error);
    return ApiErrorHandler.handle(error);
  }
}

