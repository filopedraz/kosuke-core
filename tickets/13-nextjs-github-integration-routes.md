# 📋 Ticket 13: Next.js GitHub Integration Routes

**Priority:** Medium  
**Estimated Effort:** 3 hours

## Description

Create Next.js API routes to proxy GitHub operations to the Python agent and handle GitHub-related webhooks.

## Files to Create/Update

```
app/api/projects/[id]/github/create-repo/route.ts
app/api/projects/[id]/github/import/route.ts
app/api/projects/[id]/webhook/commit/route.ts
app/api/auth/github/status/route.ts
app/api/auth/github/disconnect/route.ts
```

## Implementation Details

**app/api/projects/[id]/github/create-repo/route.ts** - Create GitHub repo:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGitHubToken } from '@/lib/github/auth';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    // Get user's GitHub token
    const githubToken = await getGitHubToken(session.user.id);
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/github/create-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to create repository', details: error },
        { status: response.status }
      );
    }

    const repoData = await response.json();

    // Update project with GitHub info
    await db
      .update(projects)
      .set({
        githubRepoUrl: repoData.url,
        githubOwner: repoData.owner,
        githubRepoName: repoData.name,
        lastGithubSync: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json(repoData);
  } catch (error) {
    console.error('Error creating GitHub repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/github/import/route.ts** - Import GitHub repo:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGitHubToken } from '@/lib/github/auth';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const { repo_url } = await request.json();

    // Get user's GitHub token
    const githubToken = await getGitHubToken(session.user.id);
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // First get repo info
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const infoResponse = await fetch(
      `${agentUrl}/api/github/repo-info?repo_url=${encodeURIComponent(repo_url)}`,
      {
        headers: {
          'X-GitHub-Token': githubToken,
        },
      }
    );

    if (!infoResponse.ok) {
      return NextResponse.json({ error: 'Invalid repository URL' }, { status: 400 });
    }

    const repoInfo = await infoResponse.json();

    // Import repository
    const importResponse = await fetch(`${agentUrl}/api/github/import-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify({
        repo_url,
        project_id: projectId,
      }),
    });

    if (!importResponse.ok) {
      const error = await importResponse.text();
      return NextResponse.json(
        { error: 'Failed to import repository', details: error },
        { status: importResponse.status }
      );
    }

    // Update project with GitHub info
    await db
      .update(projects)
      .set({
        githubRepoUrl: repo_url,
        githubOwner: repoInfo.owner,
        githubRepoName: repoInfo.name,
        lastGithubSync: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({ success: true, repo_info: repoInfo });
  } catch (error) {
    console.error('Error importing GitHub repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/webhook/commit/route.ts** - Handle commit webhooks:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
```

**app/api/auth/github/status/route.ts** - GitHub connection status:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserGitHubInfo } from '@/lib/github/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const githubInfo = await getUserGitHubInfo(session.user.id);

    return NextResponse.json({
      connected: !!githubInfo,
      username: githubInfo?.githubUsername || null,
    });
  } catch (error) {
    console.error('Error checking GitHub status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/auth/github/disconnect/route.ts** - Disconnect GitHub:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { disconnectGitHub } from '@/lib/github/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await disconnectGitHub(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Acceptance Criteria

- [x] GitHub repository operations available via Next.js API
- [x] Project-GitHub linking in database
- [x] Commit webhook handling
- [x] GitHub connection management routes

## 🎯 Summary

This comprehensive plan covers:

**Phase 1: Infrastructure & Preview Migration (Tickets 1-7)**

- Rename agent endpoints folder to routes (consistency)
- Set up Python testing infrastructure (pytest, ruff, mypy)
- Set up pre-commit hooks for code quality
- Move Docker container management from Next.js to Python agent
- Create clean API proxy layer in Next.js
- Remove old preview logic

**Phase 2: GitHub Integration (Tickets 8-13)**

- OAuth integration with Clerk
- Repository creation and import
- Auto-commit with session-based checkpoints
- Complete webhook integration

**Total Estimated Effort:** ~30 hours

**Benefits:**
✅ Lean Next.js focused on frontend  
✅ Centralized agent handling all operations  
✅ Modern GitHub workflow like Vercel  
✅ Automatic change tracking and commits  
✅ Clean separation of concerns
