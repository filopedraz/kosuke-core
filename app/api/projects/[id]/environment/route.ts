import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projectEnvironmentVariables, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/responses';

// Schema for creating environment variables
const createEnvironmentVariableSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100, 'Key must be less than 100 characters'),
  value: z.string().min(1, 'Value is required'),
  isSecret: z.boolean().default(false),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return createErrorResponse('Invalid project ID', 400);
    }

    // Verify project ownership
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.createdBy, userId)))
      .limit(1);

    if (project.length === 0) {
      return createErrorResponse('Project not found', 404);
    }

    // Fetch environment variables
    const variables = await db
      .select()
      .from(projectEnvironmentVariables)
      .where(eq(projectEnvironmentVariables.projectId, projectId))
      .orderBy(projectEnvironmentVariables.key);

    return createSuccessResponse({ variables });
  } catch (error) {
    console.error('Error fetching environment variables:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return createErrorResponse('Invalid project ID', 400);
    }

    // Parse request body
    const body = await request.json();
    const validatedData = createEnvironmentVariableSchema.parse(body);

    // Verify project ownership
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.createdBy, userId)))
      .limit(1);

    if (project.length === 0) {
      return createErrorResponse('Project not found', 404);
    }

    // Check if key already exists
    const existingVariable = await db
      .select()
      .from(projectEnvironmentVariables)
      .where(
        and(
          eq(projectEnvironmentVariables.projectId, projectId),
          eq(projectEnvironmentVariables.key, validatedData.key)
        )
      )
      .limit(1);

    if (existingVariable.length > 0) {
      return createErrorResponse('Environment variable with this key already exists', 409);
    }

    // Create environment variable
    const newVariable = await db
      .insert(projectEnvironmentVariables)
      .values({
        projectId,
        key: validatedData.key,
        value: validatedData.value,
        isSecret: validatedData.isSecret,
        description: validatedData.description,
      })
      .returning();

    return createSuccessResponse(newVariable[0], 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error creating environment variable:', error);
    return createErrorResponse('Internal server error', 500);
  }
}