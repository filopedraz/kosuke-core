import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';


// Schema for project creation
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

/**
 * GET /api/projects
 * Get all projects for the current user
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query projects directly from database
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(projects.createdAt);

    return NextResponse.json(userProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();

    // Validate the request body
    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }

    // Create the project directly in database
    const [project] = await db
      .insert(projects)
      .values({
        name: result.data.name,
        description: result.data.description || null,
        userId: userId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return ApiResponseHandler.created({ project });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
