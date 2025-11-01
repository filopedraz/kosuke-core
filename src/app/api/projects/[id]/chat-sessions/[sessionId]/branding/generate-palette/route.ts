import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { ColorPaletteService } from '@/lib/branding';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate a color palette for a session-specific project using AI
 */
export async function POST(
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

    const requestBody = await request.json();
    const keywords = requestBody.keywords || '';

    console.log(`🎨 Color palette generation request for project ${projectId}, session ${sessionId}`);
    console.log(`📋 Keywords: '${keywords}'`);

    // Generate color palette using the service
    const colorPaletteService = new ColorPaletteService();
    const result = await colorPaletteService.generateColorPalette(projectId, sessionId, keywords);

    console.log(`✅ Color palette generation ${result.success ? 'successful' : 'failed'}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in generate-palette API:', error);
    return ApiErrorHandler.handle(error);
  }
}
