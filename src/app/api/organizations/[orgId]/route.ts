import { ApiErrorHandler } from '@/lib/api/errors';
import { db } from '@/lib/db/drizzle';
import { organizations } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }

    const { orgId } = await params;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, orgId))
      .limit(1);

    if (!org) {
      return ApiErrorHandler.notFound('Organization not found');
    }

    return NextResponse.json({ data: org });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return ApiErrorHandler.handle(error);
  }
}
