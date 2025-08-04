import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projectCommits } from '@/lib/db/schema';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    // Save commit info to database
    await db.insert(projectCommits).values({
      projectId,
      commitSha: body.commit_sha,
      commitMessage: body.commit_message,
      filesChanged: body.files_changed,
      commitUrl: body.commit_url || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling commit webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}