import { ApiErrorHandler, ApiResponseHandler } from '@/lib/api';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projectEnvironmentVariables, projects } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

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
      return ApiErrorHandler.unauthorized();
    }

    const { id, varId } = await params;
    const projectId = parseInt(id);
    const variableId = parseInt(varId);

    if (isNaN(projectId) || isNaN(variableId)) {
      return ApiErrorHandler.badRequest('Invalid project ID or variable ID');
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
      return ApiErrorHandler.projectNotFound();
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
      return ApiErrorHandler.notFound('Environment variable not found');
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

    return ApiResponseHandler.success(updatedVariable[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiErrorHandler.validationError(error);
    }
    console.error('Error updating environment variable:', error);
    return ApiErrorHandler.serverError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; varId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const { id, varId } = await params;
    const projectId = parseInt(id);
    const variableId = parseInt(varId);

    if (isNaN(projectId) || isNaN(variableId)) {
      return ApiErrorHandler.badRequest('Invalid project ID or variable ID');
    }

    // Verify project ownership
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.createdBy, userId)))
      .limit(1);

    if (project.length === 0) {
      return ApiErrorHandler.projectNotFound();
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
      return ApiErrorHandler.notFound('Environment variable not found');
    }

    // Delete environment variable
    await db
      .delete(projectEnvironmentVariables)
      .where(eq(projectEnvironmentVariables.id, variableId));

    return ApiResponseHandler.success({ message: 'Environment variable deleted successfully' });
  } catch (error) {
    console.error('Error deleting environment variable:', error);
    return ApiErrorHandler.serverError(error);
  }
}
