import { auth } from '@/lib/auth/server';
import type { PreviewUrlsResponse } from '@/lib/types/preview-urls';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);

    // Proxy to Python agent to get preview URLs
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/projects/${projectId}/preview-urls`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No preview URLs found
        const emptyResponse: PreviewUrlsResponse = {
          preview_urls: [],
          total_count: 0,
        };
        return NextResponse.json({
          success: true,
          data: emptyResponse,
        });
      }
      throw new Error('Failed to fetch preview URLs from agent');
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching project preview URLs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
