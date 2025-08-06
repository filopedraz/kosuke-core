import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Basic security check - only allow SELECT queries
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return NextResponse.json(
        { error: 'Only SELECT queries are allowed for security reasons' },
        { status: 400 }
      );
    }

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/database/query/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to execute query', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing database query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}