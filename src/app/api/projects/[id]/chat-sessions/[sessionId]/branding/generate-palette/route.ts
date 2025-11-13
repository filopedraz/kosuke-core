import { ApiErrorHandler } from '@/lib/api/errors';
import { auth } from '@/lib/auth';
import { ColorPaletteService } from '@/lib/branding';
import { verifyProjectAccess } from '@/lib/projects';
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
      return ApiErrorHandler.unauthorized();
    }

    const { id: projectId, sessionId } = await params;

    if (!sessionId) {
      return ApiErrorHandler.badRequest('Session ID is required');
    }

    // Verify user has access to project through organization membership
    const { hasAccess } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
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
