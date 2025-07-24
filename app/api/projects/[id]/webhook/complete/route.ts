import { NextRequest, NextResponse } from 'next/server';

import { getProjectById } from '@/lib/db/projects';

// Webhook authentication
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret-change-in-production';

/**
 * Webhook endpoint for Python service to signal completion of chat session
 * POST /api/projects/[id]/webhook/complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify webhook authentication
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${WEBHOOK_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      console.error('Webhook authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
    
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse request body for optional completion metadata
    const {
      success = true,
      totalActions = 0,
      totalTokens = 0,
      duration = 0,
    } = await request.json();

    console.log(`✅ Webhook: Chat session completed for project ${projectId}`, {
      success,
      totalActions,
      totalTokens,
      duration: `${duration}ms`,
    });

    // Return success - this endpoint is mainly for logging and potential future features
    return NextResponse.json({
      success: true,
      projectId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in completion webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process completion' },
      { status: 500 }
    );
  }
} 