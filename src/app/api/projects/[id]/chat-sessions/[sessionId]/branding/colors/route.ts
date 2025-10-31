import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { extractExistingColors, formatColorValue, updateSingleColor } from '@/lib/css';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';


/**
 * GET /api/projects/[id]/chat-sessions/[sessionId]/branding/colors
 * Get existing color variables from the session's CSS files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return ApiErrorHandler.badRequest('Invalid project ID');
    }

    if (!sessionId) {
      return ApiErrorHandler.badRequest('Session ID is required');
    }

    // Get project and verify ownership
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    console.log(`🔍 Getting existing colors for project ${projectId}, session ${sessionId}`);

    // Extract existing colors from session
    const existingColors = await extractExistingColors(projectId, sessionId);

    console.log(`📊 Found ${existingColors.length} existing colors in session ${sessionId}`);

    return NextResponse.json({
      success: true,
      colors: existingColors.map(color => ({
        name: color.name,
        lightValue: formatColorValue(color.lightValue),
        darkValue: color.darkValue ? formatColorValue(color.darkValue) : null,
        scope: color.scope,
        description: color.description,
      })),
      count: existingColors.length,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Error fetching session colors:', error);
    return ApiErrorHandler.serverError(error);
  }
}

/**
 * POST /api/projects/[id]/chat-sessions/[sessionId]/branding/colors
 * Update a single color variable in the session's CSS files
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, sessionId } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return ApiErrorHandler.badRequest('Invalid project ID');
    }

    if (!sessionId) {
      return ApiErrorHandler.badRequest('Session ID is required');
    }

    // Get project and verify ownership
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

    if (!project) {
      return ApiErrorHandler.notFound('Project not found');
    }

    if (project.createdBy !== userId) {
      return ApiErrorHandler.forbidden();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.value) {
      return ApiErrorHandler.badRequest('Missing required fields: name and value are required');
    }

    const mode = body.mode || 'light';
    if (mode !== 'light' && mode !== 'dark') {
      return ApiErrorHandler.badRequest('Invalid mode: must be "light" or "dark"');
    }

    console.log(`🎨 Session color update request for project ${projectId}, session ${sessionId}`);

    // Update single color using CSS operations
    const result = await updateSingleColor(projectId, sessionId, body.name, body.value, mode);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update color', details: result.message },
        { status: 400 }
      );
    }

    console.log(`✅ Session color update successful`);

    return NextResponse.json({
      success: true,
      message: result.message,
      mode,
    });
  } catch (error) {
    console.error('Error updating session color:', error);
    return ApiErrorHandler.serverError(error);
  }
}
