import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { getSessionFonts } from '@/lib/branding';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
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

    // Get fonts from session
    console.log(`🔍 Getting fonts for project ${projectId}, session ${sessionId}`);

    const fonts = await getSessionFonts(projectId, sessionId);

    console.log(`📊 Found ${fonts.length} fonts in session ${sessionId}`);

    return NextResponse.json({
      success: true,
      fonts,
      count: fonts.length,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Error fetching session fonts:', error);
    return ApiErrorHandler.handle(error);
  }
}
