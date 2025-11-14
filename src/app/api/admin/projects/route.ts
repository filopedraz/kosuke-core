import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/admin/permissions';
import { db } from '@/lib/db/drizzle';
import { projects } from '@/lib/db/schema';
import { ilike, eq, and, or } from 'drizzle-orm';

/**
 * GET /api/admin/projects
 * Get all projects across all organizations (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check super admin access
    await requireSuperAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Build query conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(projects.name, `%${search}%`),
          ilike(projects.description, `%${search}%`)
        )
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(projects.status, status as 'requirements' | 'in_development' | 'active'));
    }

    // Fetch projects
    const projectsList = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        orgId: projects.orgId,
        createdBy: projects.createdBy,
        createdAt: projects.createdAt,
        requirementsCompletedAt: projects.requirementsCompletedAt,
        requirementsCompletedBy: projects.requirementsCompletedBy,
      })
      .from(projects)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(projects.createdAt);

    return NextResponse.json({
      success: true,
      data: {
        projects: projectsList,
      },
    });
  } catch (error) {
    console.error('Error fetching admin projects:', error);

    if (error instanceof Error && error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

