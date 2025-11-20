import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/drizzle';
import { projectAuditLogs, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { verifyProjectAccess } from '@/lib/projects';
import { z } from 'zod';

const requirementsMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

const confirmRequirementsSchema = z.object({
  confirm: z.boolean(),
});

/**
 * GET /api/projects/[id]/requirements
 * Get current docs.md content for requirements gathering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify project access
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);
    if (!hasAccess || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is in requirements status
    if (project.status !== 'requirements' && project.status !== 'in_development') {
      return NextResponse.json(
        { error: 'Project is not in requirements gathering mode' },
        { status: 400 }
      );
    }

    // For now, return empty docs content until actual requirements are generated
    // TODO: Integrate with actual git repository once we have the project path
    // TODO: Read from actual docs.md file when kosuke-cli integration is complete
    const docsContent = '';

    return NextResponse.json({
      success: true,
      data: {
        docs: docsContent,
        status: project.status,
      },
    });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requirements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/requirements
 * Send a message for requirements gathering (uses Kosuke CLI)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify project access
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);
    if (!hasAccess || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is in requirements status
    if (project.status !== 'requirements') {
      return NextResponse.json(
        { error: 'Project is not in requirements gathering mode' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = requirementsMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    // TODO: Implement actual kosuke-cli integration
    // For now, return a mock response
    const mockResponse = `Based on your message: "${message}"

I understand you'd like to build a project. Let me help you refine the requirements.

**Current Understanding:**
- Project Name: ${project.name}
- Initial Concept: ${message}

**Questions to refine requirements:**
1. What is the primary goal of this project?
2. Who are the target users?
3. What are the must-have features for v1?
4. Are there any technical constraints or preferences?

Please provide more details so I can help build a comprehensive requirements document.`;

    return NextResponse.json({
      success: true,
      data: {
        response: mockResponse,
        docs: `# ${project.name}\n\n${mockResponse}`,
      },
    });
  } catch (error) {
    console.error('Error processing requirements message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/requirements
 * Confirm requirements and transition to in_development status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify project access
    const { hasAccess, project } = await verifyProjectAccess(userId, projectId);
    if (!hasAccess || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is in requirements status
    if (project.status !== 'requirements') {
      return NextResponse.json(
        { error: 'Project is not in requirements gathering mode' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = confirmRequirementsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    if (!validation.data.confirm) {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    }

    // Update project status to in_development
    await db
      .update(projects)
      .set({
        status: 'in_development',
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // Create audit log
    await db.insert(projectAuditLogs).values({
      projectId,
      userId,
      action: 'requirements_confirmed',
      previousValue: 'requirements',
      newValue: 'in_development',
      metadata: {
        confirmedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        status: 'in_development',
        message:
          'Requirements confirmed! Your project is now in development. You will be notified by email when it is ready.',
      },
    });
  } catch (error) {
    console.error('Error confirming requirements:', error);
    return NextResponse.json(
      { error: 'Failed to confirm requirements' },
      { status: 500 }
    );
  }
}

