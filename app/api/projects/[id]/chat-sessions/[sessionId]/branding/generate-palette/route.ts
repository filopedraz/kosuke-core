import { auth } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate a color palette for a session-specific project
 * ?apply=true - Generate and apply the palette
 * ?apply=false - Only generate the palette without applying (default)
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

    // Check if we should apply the palette or just generate it
    const url = new URL(request.url);
    const shouldApply = url.searchParams.get('apply') === 'true';

    // Extract request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      requestBody = {};
    }

    // Determine the endpoint based on whether we're applying or just generating
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    let endpoint: string;

    if (shouldApply && requestBody.colors && Array.isArray(requestBody.colors)) {
      // Apply provided colors
      endpoint = `${agentUrl}/api/projects/${projectId}/sessions/${sessionId}/branding/apply-palette`;
    } else {
      // Generate new palette
      endpoint = `${agentUrl}/api/projects/${projectId}/sessions/${sessionId}/branding/generate-palette`;
    }

    // Proxy to Python agent service for session-specific palette operations
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to process color palette', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();

    // If we're applying and it succeeded, also apply locally if needed
    if (shouldApply && result.success) {
      return NextResponse.json({
        success: true,
        message: 'Successfully generated and applied color palette',
        colors: result.colors || requestBody.colors
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in session generate-palette API:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
