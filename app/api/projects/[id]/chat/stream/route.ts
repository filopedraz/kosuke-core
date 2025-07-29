import { getSession } from '@/lib/auth/session';
import { getProjectById } from '@/lib/db/projects';
import { NextRequest } from 'next/server';

/**
 * POST - Stream chat response from Python FastAPI service
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<Response> {
  try {
    const session = await getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await context.params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return new Response('Invalid project ID', { status: 400 });
    }

    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    // Check if the user has access to the project
    if (project.createdBy !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return new Response('Content is required', { status: 400 });
    }

    // Proxy to Python FastAPI service for streaming
    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

    const response = await fetch(`${agentServiceUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        prompt: content,  // Changed from 'content' to 'prompt' to match FastAPI ChatRequest model
      }),
    });

    if (!response.ok) {
      // Get detailed error information from FastAPI
      let errorDetails = response.statusText;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          console.error('Python agent service error body:', errorBody);
          errorDetails = errorBody;
        }
      } catch (e) {
        console.error('Failed to read error response body:', e);
      }

      console.error('Python agent service error:', response.status, response.statusText);
      return new Response(`Agent service error: ${errorDetails}`, {
        status: response.status
      });
    }

    // Stream the response from Python service to client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error proxying to Python agent service:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
