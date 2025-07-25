import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@clerk/nextjs';
import { 
  createProject, 
  getProjectsByUserId 
} from '@/lib/db/projects';


// Schema for project creation
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

/**
 * GET /api/projects
 * Get all projects for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const projects = await getProjectsByUserId(Number(userId));
    return NextResponse.json(projects);
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
    const { userId } = auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }
    
    // Create the project
    const project = await createProject({
      name: result.data.name,
      description: result.data.description || null,
      userId: userId,
      createdBy: userId,
    });

    return ApiResponseHandler.created({ project });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
} 