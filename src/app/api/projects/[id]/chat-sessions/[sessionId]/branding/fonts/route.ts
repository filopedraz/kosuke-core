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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, sessionId } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
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
