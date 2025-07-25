import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AGENT_SERVICE_URL } from '@/lib/constants';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // TODO: Fetch project environment variables when the table is implemented
    // const envVars = await db
    //   .select()
    //   .from(projectEnvironmentVariables)
    //   .where(eq(projectEnvironmentVariables.projectId, projectId));
    
    // Convert to key-value object
    // const envVarsObject = envVars.reduce(
    //   (acc, envVar) => {
    //     acc[envVar.key] = envVar.value;
    //     return acc;
    //   },
    //   {} as Record<string, string>
    // );

    // Proxy request to Python agent with environment variables
    const response = await fetch(`${AGENT_SERVICE_URL}/api/preview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        // env_vars: envVarsObject, // TODO: Uncomment when environment variables table is implemented
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to start preview', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error starting preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}