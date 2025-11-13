import { ApiErrorHandler, ApiResponseHandler } from '@/lib/api';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { projectEnvironmentVariables } from '@/lib/db/schema';
import { verifyProjectAccess } from '@/lib/projects';
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

    const { id: projectId, varId: variableId } = await params;

    // Parse request body
    const body = await request.json();
    const validatedData = updateEnvironmentVariableSchema.parse(body);

    // Verify user has access to project through organization membership
    const { hasAccess, isOrgAdmin } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
    }

    // Only org admins can update environment variables
    if (!isOrgAdmin) {
      return ApiErrorHandler.forbidden('Only organization admins can update environment variables');
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

    const { id: projectId, varId: variableId } = await params;

    // Verify user has access to project through organization membership
    const { hasAccess, isOrgAdmin } = await verifyProjectAccess(userId, projectId);

    if (!hasAccess) {
      return ApiErrorHandler.projectNotFound();
    }

    // Only org admins can delete environment variables
    if (!isOrgAdmin) {
      return ApiErrorHandler.forbidden('Only organization admins can delete environment variables');
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
