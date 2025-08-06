import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projectEnvironmentVariables, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSuccessResponse, createErrorResponse } from '@/lib/api/responses';

// Schema for updating environment variables
const updateEnvironmentVariableSchema = z.object({
  value: z.string().min(1, 'Value is required').optional(),
  isSecret: z.boolean().optional(),
  description: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; varId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { id, varId } = await params;
    const projectId = parseInt(id);
    const variableId = parseInt(varId);

    if (isNaN(projectId) || isNaN(variableId)) {
      return createErrorResponse('Invalid project ID or variable ID', 400);
    }

    // Parse request body
    const body = await request.json();
    const validatedData = updateEnvironmentVariableSchema.parse(body);

    // Verify project ownership
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.createdBy, userId)))
      .limit(1);

    if (project.length === 0) {
      return createErrorResponse('Project not found', 404);
    }

    // Verify variable exists and belongs to project
    const existingVariable = await db
      .select()
      .from(projectEnvironmentVariables)
      .where(
        and(
          eq(projectEnvironmentVariables.id, variableId),
          eq(projectEnvironmentVariables.projectId, projectId)
        )
      )
      .limit(1);

    if (existingVariable.length === 0) {
      return createErrorResponse('Environment variable not found', 404);
    }

    // Update environment variable
    const updatedVariable = await db
      .update(projectEnvironmentVariables)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(projectEnvironmentVariables.id, variableId))
      .returning();

    return createSuccessResponse(updatedVariable[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error updating environment variable:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; varId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { id, varId } = await params;
    const projectId = parseInt(id);
    const variableId = parseInt(varId);

    if (isNaN(projectId) || isNaN(variableId)) {
      return createErrorResponse('Invalid project ID or variable ID', 400);
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

    // Verify variable exists and belongs to project
    const existingVariable = await db
      .select()
      .from(projectEnvironmentVariables)
      .where(
        and(
          eq(projectEnvironmentVariables.id, variableId),
          eq(projectEnvironmentVariables.projectId, projectId)
        )
      )
      .limit(1);

    if (existingVariable.length === 0) {
      return createErrorResponse('Environment variable not found', 404);
    }

    // Delete environment variable
    await db
      .delete(projectEnvironmentVariables)
      .where(eq(projectEnvironmentVariables.id, variableId));

    return createSuccessResponse({ message: 'Environment variable deleted successfully' });
  } catch (error) {
    console.error('Error deleting environment variable:', error);
    return createErrorResponse('Internal server error', 500);
  }
}