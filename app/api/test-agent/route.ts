import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify Python agent service connectivity
 */
export async function GET() {
  try {
    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

    console.log(`Testing connection to Python agent service at: ${agentServiceUrl}`);

    // Test health endpoint
    const healthResponse = await fetch(`${agentServiceUrl}/api/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!healthResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Python agent service health check failed: ${healthResponse.statusText}`,
          status: healthResponse.status,
          agentServiceUrl,
        },
        { status: 500 }
      );
    }

    const healthData = await healthResponse.json();

    // Test simple chat endpoint
    const testChatResponse = await fetch(`${agentServiceUrl}/api/chat/test`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    let chatData = null;
    if (testChatResponse.ok) {
      chatData = await testChatResponse.json();
    }

    return NextResponse.json({
      success: true,
      message: 'Python agent service is accessible',
      agentServiceUrl,
      health: healthData,
      testChat: chatData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error testing Python agent service:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        agentServiceUrl: process.env.AGENT_SERVICE_URL || 'http://localhost:8000',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Test endpoint for proxying a simple message to Python service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message = 'Hello from Next.js proxy!' } = body;

    const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

    console.log(`Testing proxy to Python agent service: ${message}`);

    const response = await fetch(`${agentServiceUrl}/api/chat/simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: 999, // Test project ID
        content: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: `Python agent service error: ${response.statusText}`,
          details: errorData,
          status: response.status,
        },
        { status: 500 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Successfully proxied message to Python agent service',
      request: { message },
      response: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error proxying to Python agent service:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
