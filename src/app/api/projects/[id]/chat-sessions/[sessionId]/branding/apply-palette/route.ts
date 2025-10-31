import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { applyColorPalette } from '@/lib/css';
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
    // Extract request body
    const colors = requestBody.colors;
    if (!colors || !Array.isArray(colors) || colors.length === 0) {
      return NextResponse.json({ error: 'Colors array is required and must not be empty' }, { status: 400 });
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

