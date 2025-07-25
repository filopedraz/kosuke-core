import { auth } from "@clerk/nextjs";
import { AGENT_SERVICE_URL } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/projects/[id]/preview/status
 * Check the status of a project preview (proxied to Python agent)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Proxy request to Python agent
    const response = await fetch(`${AGENT_SERVICE_URL}/api/preview/status/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to get preview status', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting preview status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
