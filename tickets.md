# 🎯 Agent Enhancement & GitHub Integration Tickets

## Phase 1: Preview Logic Migration

## 📋 Ticket 1: Setup Python Docker Integration

**Priority:** Critical  
**Estimated Effort:** 4 hours

### Description

Add Docker SDK and container management capabilities to the Python agent service. This will prepare the foundation for migrating the preview logic.

### Files to Create/Update

```
agent/app/services/docker_service.py
agent/requirements.txt (add docker dependency)
agent/app/models/preview.py
```

### Implementation Details

**agent/requirements.txt** - Add Docker dependency:

```txt
# Add to existing requirements
docker==7.0.0
```

**agent/app/models/preview.py** - Preview data models:

```python
from pydantic import BaseModel
from typing import Optional

class ContainerInfo(BaseModel):
    project_id: int
    container_id: str
    container_name: str
    port: int
    url: str
    compilation_complete: bool = False
    is_responding: bool = False

class PreviewStatus(BaseModel):
    running: bool
    url: Optional[str] = None
    compilation_complete: bool
    is_responding: bool

class StartPreviewRequest(BaseModel):
    project_id: int

class StopPreviewRequest(BaseModel):
    project_id: int
```

**agent/app/services/docker_service.py** - Docker management service:

```python
import docker
import asyncio
import random
from typing import Dict, Optional
from app.models.preview import ContainerInfo, PreviewStatus
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)

class DockerService:
    def __init__(self):
        self.client = docker.from_env()
        self.containers: Dict[int, ContainerInfo] = {}
        self.CONTAINER_NAME_PREFIX = "kosuke-preview-"
        self.DEFAULT_IMAGE = "node:18-alpine"

    async def is_docker_available(self) -> bool:
        """Check if Docker is available"""
        try:
            self.client.ping()
            return True
        except Exception as e:
            logger.error(f"Docker not available: {e}")
            return False

    def _get_random_port(self, min_port: int = 3000, max_port: int = 4000) -> int:
        """Get a random port in range"""
        return random.randint(min_port, max_port)

    def _get_container_name(self, project_id: int) -> str:
        """Generate container name for project"""
        return f"{self.CONTAINER_NAME_PREFIX}{project_id}"

    async def start_preview(self, project_id: int) -> str:
        """Start preview container for project"""
        container_name = self._get_container_name(project_id)

        # Check if container already exists
        if project_id in self.containers:
            container_info = self.containers[project_id]
            return container_info.url

        # Check for existing Docker container
        try:
            existing_container = self.client.containers.get(container_name)
            if existing_container.status == 'running':
                # Container exists and running, extract port and reuse
                ports = existing_container.ports
                if '3000/tcp' in ports and ports['3000/tcp']:
                    host_port = int(ports['3000/tcp'][0]['HostPort'])
                    url = f"http://localhost:{host_port}"

                    container_info = ContainerInfo(
                        project_id=project_id,
                        container_id=existing_container.id,
                        container_name=container_name,
                        port=host_port,
                        url=url,
                        compilation_complete=True
                    )
                    self.containers[project_id] = container_info
                    return url
            else:
                # Container exists but not running, remove it
                existing_container.remove(force=True)
        except docker.errors.NotFound:
            # Container doesn't exist, which is fine
            pass

        # Create new container
        host_port = self._get_random_port()
        project_path = f"{settings.PROJECTS_DIR}/{project_id}"

        container = self.client.containers.run(
            image=self.DEFAULT_IMAGE,
            name=container_name,
            command=["sh", "-c", "cd /app/project && npm run dev -- -H 0.0.0.0"],
            ports={'3000/tcp': host_port},
            volumes={project_path: {'bind': '/app/project', 'mode': 'rw'}},
            working_dir='/app/project',
            environment={
                'PROJECT_ID': str(project_id),
                'NODE_ENV': 'development',
                'NEXT_TELEMETRY_DISABLED': '1'
            },
            detach=True,
            auto_remove=False
        )

        url = f"http://localhost:{host_port}"
        container_info = ContainerInfo(
            project_id=project_id,
            container_id=container.id,
            container_name=container_name,
            port=host_port,
            url=url,
            compilation_complete=False
        )

        self.containers[project_id] = container_info

        # Start monitoring compilation in background
        asyncio.create_task(self._monitor_compilation(project_id, container))

        return url

    async def _monitor_compilation(self, project_id: int, container):
        """Monitor container logs for compilation completion"""
        try:
            for log in container.logs(stream=True, follow=True):
                log_str = log.decode('utf-8')
                if 'compiled successfully' in log_str or 'ready started server' in log_str:
                    if project_id in self.containers:
                        self.containers[project_id].compilation_complete = True
                    break
        except Exception as e:
            logger.error(f"Error monitoring compilation for project {project_id}: {e}")

    async def stop_preview(self, project_id: int) -> None:
        """Stop preview container for project"""
        if project_id not in self.containers:
            return

        container_info = self.containers[project_id]
        try:
            container = self.client.containers.get(container_info.container_id)
            container.stop(timeout=5)
            container.remove(force=True)
        except docker.errors.NotFound:
            pass  # Container already removed
        except Exception as e:
            logger.error(f"Error stopping container for project {project_id}: {e}")
        finally:
            del self.containers[project_id]

    async def get_preview_status(self, project_id: int) -> PreviewStatus:
        """Get preview status for project"""
        if project_id not in self.containers:
            return PreviewStatus(
                running=False,
                url=None,
                compilation_complete=False,
                is_responding=False
            )

        container_info = self.containers[project_id]

        # Check if container is responding
        is_responding = False
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(container_info.url, timeout=5) as response:
                    is_responding = response.status == 200
        except:
            is_responding = False

        return PreviewStatus(
            running=True,
            url=container_info.url,
            compilation_complete=container_info.compilation_complete,
            is_responding=is_responding
        )

    async def stop_all_previews(self) -> None:
        """Stop all preview containers"""
        project_ids = list(self.containers.keys())
        for project_id in project_ids:
            await self.stop_preview(project_id)
```

### Acceptance Criteria

- [x] Docker SDK integrated into Python agent
- [x] Container management service created
- [x] Preview data models defined
- [x] Basic start/stop/status operations implemented

---

## 📋 Ticket 2: Add Preview API Endpoints to Agent

**Priority:** Critical  
**Estimated Effort:** 3 hours

### Description

Create FastAPI endpoints in the Python agent for preview management, replacing the Next.js preview logic.

### Files to Create/Update

```
agent/app/api/endpoints/preview.py
agent/app/main.py (update to include preview router)
```

### Implementation Details

**agent/app/api/endpoints/preview.py** - Preview API endpoints:

```python
from fastapi import APIRouter, HTTPException, Depends
from app.services.docker_service import DockerService
from app.models.preview import StartPreviewRequest, StopPreviewRequest, PreviewStatus
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependency to get Docker service
async def get_docker_service() -> DockerService:
    return DockerService()

@router.post("/preview/start")
async def start_preview(
    request: StartPreviewRequest,
    docker_service: DockerService = Depends(get_docker_service)
):
    """Start a preview for a project"""
    try:
        if not await docker_service.is_docker_available():
            raise HTTPException(status_code=503, detail="Docker is not available")

        url = await docker_service.start_preview(request.project_id)
        return {
            "success": True,
            "url": url,
            "project_id": request.project_id
        }
    except Exception as e:
        logger.error(f"Error starting preview for project {request.project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start preview: {str(e)}")

@router.post("/preview/stop")
async def stop_preview(
    request: StopPreviewRequest,
    docker_service: DockerService = Depends(get_docker_service)
):
    """Stop a preview for a project"""
    try:
        await docker_service.stop_preview(request.project_id)
        return {
            "success": True,
            "project_id": request.project_id
        }
    except Exception as e:
        logger.error(f"Error stopping preview for project {request.project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop preview: {str(e)}")

@router.get("/preview/status/{project_id}")
async def get_preview_status(
    project_id: int,
    docker_service: DockerService = Depends(get_docker_service)
) -> PreviewStatus:
    """Get preview status for a project"""
    try:
        status = await docker_service.get_preview_status(project_id)
        return status
    except Exception as e:
        logger.error(f"Error getting preview status for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get preview status: {str(e)}")

@router.post("/preview/stop-all")
async def stop_all_previews(
    docker_service: DockerService = Depends(get_docker_service)
):
    """Stop all preview containers"""
    try:
        await docker_service.stop_all_previews()
        return {"success": True, "message": "All previews stopped"}
    except Exception as e:
        logger.error(f"Error stopping all previews: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop all previews: {str(e)}")

@router.get("/preview/health")
async def preview_health(
    docker_service: DockerService = Depends(get_docker_service)
):
    """Check preview service health"""
    docker_available = await docker_service.is_docker_available()
    return {
        "status": "healthy" if docker_available else "unhealthy",
        "docker_available": docker_available
    }
```

**agent/app/main.py** - Update to include preview router:

```python
# Add this import
from app.api.endpoints import preview

# Add this line after existing routers
app.include_router(preview.router, prefix="/api", tags=["preview"])
```

### Acceptance Criteria

- [x] Preview endpoints created in Python agent
- [x] Start/stop/status operations available via API
- [x] Error handling and logging implemented
- [x] Health check endpoint for preview service

---

## 📋 Ticket 3: Update Next.js to Proxy Preview Requests

**Priority:** High  
**Estimated Effort:** 2 hours

### Description

Update Next.js API routes to proxy preview requests to the Python agent instead of handling them directly.

### Files to Create/Update

```
app/api/projects/[id]/preview/start/route.ts
app/api/projects/[id]/preview/stop/route.ts
app/api/projects/[id]/preview/status/route.ts
```

### Implementation Details

**app/api/projects/[id]/preview/start/route.ts** - Proxy start preview:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Proxy request to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/preview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project_id: projectId }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to start preview', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error starting preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/preview/stop/route.ts** - Proxy stop preview:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Proxy request to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/preview/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ project_id: projectId }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to stop preview', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error stopping preview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/preview/status/route.ts** - Proxy preview status:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Proxy request to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/preview/status/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to get preview status', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting preview status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Acceptance Criteria

- [x] Next.js preview routes proxy to Python agent
- [x] Authentication maintained on Next.js side
- [x] Error handling for proxy requests
- [x] All preview operations work through new flow

---

## 📋 Ticket 4: Remove Old Preview Logic from Next.js

**Priority:** Medium  
**Estimated Effort:** 1 hour

### Description

Clean up the old preview logic from Next.js `lib/preview/` directory since it's now handled by the Python agent.

### Files to Delete/Update

```
lib/preview/ (entire directory - DELETE)
Update any imports that reference the old preview logic
```

### Implementation Details

**Files to delete:**

- `lib/preview/baseRunner.ts`
- `lib/preview/dockerRunner.ts`
- `lib/preview/k8sRunner.ts`
- `lib/preview/preview.ts`
- `lib/preview/index.ts`

**Search and update imports:** Look for any remaining imports of `@/lib/preview` and remove them.

### Acceptance Criteria

- [x] Old preview directory completely removed
- [x] No broken imports remain
- [x] Build passes without preview logic
- [x] All preview functionality works through agent

---

## Phase 2: GitHub Integration

## 📋 Ticket 5: Database Schema for GitHub Integration

**Priority:** Critical  
**Estimated Effort:** 2 hours

### Description

Add database tables and fields to support GitHub integration, including repository linking and user tokens.

### Files to Create/Update

```
lib/db/migrations/XXXX_github_integration.sql
lib/db/schema.ts (update)
```

### Implementation Details

**lib/db/migrations/XXXX_github_integration.sql** - Migration file:

```sql
-- Add GitHub fields to projects table
ALTER TABLE projects ADD COLUMN github_repo_url TEXT;
ALTER TABLE projects ADD COLUMN github_owner TEXT;
ALTER TABLE projects ADD COLUMN github_repo_name TEXT;
ALTER TABLE projects ADD COLUMN github_branch TEXT DEFAULT 'main';
ALTER TABLE projects ADD COLUMN auto_commit BOOLEAN DEFAULT true;
ALTER TABLE projects ADD COLUMN last_github_sync TIMESTAMP;

-- Create user GitHub tokens table
CREATE TABLE user_github_tokens (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_token TEXT NOT NULL,
    github_username TEXT,
    token_scope TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create project commits tracking table
CREATE TABLE project_commits (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    commit_sha TEXT NOT NULL,
    commit_message TEXT NOT NULL,
    commit_url TEXT,
    files_changed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create GitHub sync sessions table (for checkpoint commits)
CREATE TABLE github_sync_sessions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    commit_sha TEXT,
    files_changed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' -- active, completed, failed
);

-- Add indexes for performance
CREATE INDEX idx_user_github_tokens_user_id ON user_github_tokens(user_id);
CREATE INDEX idx_project_commits_project_id ON project_commits(project_id);
CREATE INDEX idx_github_sync_sessions_project_id ON github_sync_sessions(project_id);
CREATE INDEX idx_github_sync_sessions_session_id ON github_sync_sessions(session_id);
```

**lib/db/schema.ts** - Update schema:

```typescript
// Add to existing schema file
export const userGithubTokens = pgTable('user_github_tokens', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  githubToken: text('github_token').notNull(),
  githubUsername: text('github_username'),
  tokenScope: text('token_scope').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const projectCommits = pgTable('project_commits', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  commitSha: text('commit_sha').notNull(),
  commitMessage: text('commit_message').notNull(),
  commitUrl: text('commit_url'),
  filesChanged: integer('files_changed').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const githubSyncSessions = pgTable('github_sync_sessions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  startTime: timestamp('start_time').defaultNow(),
  endTime: timestamp('end_time'),
  commitSha: text('commit_sha'),
  filesChanged: integer('files_changed').default(0),
  status: text('status').default('active'), // active, completed, failed
});

// Update projects table
export const projects = pgTable('projects', {
  // ... existing fields
  githubRepoUrl: text('github_repo_url'),
  githubOwner: text('github_owner'),
  githubRepoName: text('github_repo_name'),
  githubBranch: text('github_branch').default('main'),
  autoCommit: boolean('auto_commit').default(true),
  lastGithubSync: timestamp('last_github_sync'),
});
```

### Acceptance Criteria

- [x] Database migration created and applied
- [x] Schema updated with GitHub fields
- [x] Proper indexes and foreign keys
- [x] Support for tokens, commits, and sync sessions

---

## 📋 Ticket 6: GitHub OAuth Integration with Clerk

**Priority:** High  
**Estimated Effort:** 4 hours

### Description

Set up GitHub OAuth integration using Clerk for user authentication with GitHub, allowing users to connect their GitHub accounts.

### Files to Create/Update

```
app/api/auth/github/connect/route.ts
app/api/auth/github/callback/route.ts
components/auth/github-connect-button.tsx
lib/github/auth.ts
```

### Implementation Details

**lib/github/auth.ts** - GitHub authentication utilities:

```typescript
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userGithubTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface GitHubTokenInfo {
  access_token: string;
  scope: string;
  token_type: string;
}

export async function storeGitHubToken(
  userId: string,
  tokenInfo: GitHubTokenInfo,
  username: string
) {
  await db
    .insert(userGithubTokens)
    .values({
      userId,
      githubToken: tokenInfo.access_token,
      githubUsername: username,
      tokenScope: tokenInfo.scope.split(','),
    })
    .onConflictDoUpdate({
      target: userGithubTokens.userId,
      set: {
        githubToken: tokenInfo.access_token,
        githubUsername: username,
        tokenScope: tokenInfo.scope.split(','),
        updatedAt: new Date(),
      },
    });
}

export async function getGitHubToken(userId: string): Promise<string | null> {
  const result = await db
    .select()
    .from(userGithubTokens)
    .where(eq(userGithubTokens.userId, userId))
    .limit(1);
  return result[0]?.githubToken || null;
}

export async function getUserGitHubInfo(userId: string) {
  const result = await db
    .select()
    .from(userGithubTokens)
    .where(eq(userGithubTokens.userId, userId))
    .limit(1);
  return result[0] || null;
}

export async function disconnectGitHub(userId: string) {
  await db.delete(userGithubTokens).where(eq(userGithubTokens.userId, userId));
}
```

**app/api/auth/github/connect/route.ts** - GitHub OAuth initiation:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 });
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/github/callback`;
    const scope = 'repo,user:email,read:user';
    const state = session.user.id; // Use user ID as state for security

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;

    return NextResponse.redirect(githubAuthUrl);
  } catch (error) {
    console.error('Error initiating GitHub OAuth:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/auth/github/callback/route.ts** - GitHub OAuth callback:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { storeGitHubToken } from '@/lib/github/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should be the user ID
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?github_error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?github_error=missing_params`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?github_error=${tokenData.error}`
      );
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    // Store the token
    await storeGitHubToken(state, tokenData, userData.login);

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?github_connected=true`);
  } catch (error) {
    console.error('Error in GitHub OAuth callback:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?github_error=server_error`);
  }
}
```

**components/auth/github-connect-button.tsx** - GitHub connection UI:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Github, Check, X } from 'lucide-react';

interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
}

export function GitHubConnectButton() {
  const [status, setStatus] = useState<GitHubConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  async function checkGitHubConnection() {
    try {
      const response = await fetch('/api/auth/github/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    window.location.href = '/api/auth/github/connect';
  }

  async function handleDisconnect() {
    try {
      const response = await fetch('/api/auth/github/disconnect', { method: 'POST' });
      if (response.ok) {
        setStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
    }
  }

  if (loading) {
    return (
      <Button disabled variant="outline">
        <Github className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-green-600">
          <Check className="w-4 h-4" />
          <span>Connected as @{status.username}</span>
        </div>
        <Button onClick={handleDisconnect} variant="outline" size="sm">
          <X className="w-4 h-4 mr-2" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} variant="outline">
      <Github className="w-4 h-4 mr-2" />
      Connect GitHub
    </Button>
  );
}
```

### Acceptance Criteria

- [x] GitHub OAuth flow working with Clerk
- [x] Tokens stored securely in database
- [x] User can connect/disconnect GitHub account
- [x] GitHub username and scopes tracked

---

## 📋 Ticket 7: GitHub Service in Python Agent

**Priority:** Critical  
**Estimated Effort:** 6 hours

### Description

Create GitHub integration service in the Python agent for repository operations, including creating repos, cloning, and managing commits.

### Files to Create/Update

```
agent/app/services/github_service.py
agent/app/models/github.py
agent/requirements.txt (add GitHub dependencies)
```

### Implementation Details

**agent/requirements.txt** - Add GitHub dependencies:

```txt
# Add to existing requirements
PyGithub==2.1.1
GitPython==3.1.40
```

**agent/app/models/github.py** - GitHub data models:

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class GitHubRepo(BaseModel):
    name: str
    owner: str
    url: str
    private: bool = True
    description: Optional[str] = None

class GitHubCommit(BaseModel):
    sha: str
    message: str
    url: str
    files_changed: int
    timestamp: datetime

class CreateRepoRequest(BaseModel):
    name: str
    description: Optional[str] = None
    private: bool = True
    template_repo: Optional[str] = None

class ImportRepoRequest(BaseModel):
    repo_url: str
    project_id: int

class CommitChangesRequest(BaseModel):
    project_id: int
    session_id: str
    message: Optional[str] = None
    files: List[str] = []

class SyncSessionInfo(BaseModel):
    session_id: str
    project_id: int
    files_changed: List[str] = []
    start_time: datetime
    status: str = "active"
```

**agent/app/services/github_service.py** - GitHub operations service:

```python
import os
import git
import tempfile
import shutil
from github import Github
from typing import Optional, List, Dict
from datetime import datetime
from app.models.github import GitHubRepo, GitHubCommit, CreateRepoRequest, ImportRepoRequest
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self, github_token: str):
        self.github = Github(github_token)
        self.user = self.github.get_user()
        self.sync_sessions: Dict[str, Dict] = {}

    async def create_repository(self, request: CreateRepoRequest) -> GitHubRepo:
        """Create a new GitHub repository"""
        try:
            # Check if template repo should be used
            if request.template_repo:
                # Use template repository
                template = self.github.get_repo(request.template_repo)
                repo = self.user.create_repo_from_template(
                    template,
                    request.name,
                    description=request.description,
                    private=request.private
                )
            else:
                # Create empty repository
                repo = self.user.create_repo(
                    request.name,
                    description=request.description,
                    private=request.private,
                    auto_init=True,
                    gitignore_template="Node"
                )

            return GitHubRepo(
                name=repo.name,
                owner=repo.owner.login,
                url=repo.clone_url,
                private=repo.private,
                description=repo.description
            )
        except Exception as e:
            logger.error(f"Error creating repository: {e}")
            raise Exception(f"Failed to create repository: {str(e)}")

    async def import_repository(self, request: ImportRepoRequest) -> str:
        """Import/clone a GitHub repository to local project"""
        try:
            project_path = f"{settings.PROJECTS_DIR}/{request.project_id}"

            # Remove existing project directory if it exists
            if os.path.exists(project_path):
                shutil.rmtree(project_path)

            # Clone repository
            repo = git.Repo.clone_from(request.repo_url, project_path)

            logger.info(f"Successfully imported repository to project {request.project_id}")
            return project_path
        except Exception as e:
            logger.error(f"Error importing repository: {e}")
            raise Exception(f"Failed to import repository: {str(e)}")

    def start_sync_session(self, project_id: int, session_id: str) -> None:
        """Start a new sync session for tracking changes"""
        self.sync_sessions[session_id] = {
            "project_id": project_id,
            "files_changed": [],
            "start_time": datetime.now(),
            "status": "active"
        }
        logger.info(f"Started sync session {session_id} for project {project_id}")

    def track_file_change(self, session_id: str, file_path: str) -> None:
        """Track a file change in the current sync session"""
        if session_id in self.sync_sessions:
            session = self.sync_sessions[session_id]
            if file_path not in session["files_changed"]:
                session["files_changed"].append(file_path)

    async def commit_session_changes(
        self,
        session_id: str,
        commit_message: Optional[str] = None
    ) -> Optional[GitHubCommit]:
        """Commit all changes from a sync session"""
        if session_id not in self.sync_sessions:
            raise Exception(f"Sync session {session_id} not found")

        session = self.sync_sessions[session_id]
        project_id = session["project_id"]
        files_changed = session["files_changed"]

        if not files_changed:
            logger.info(f"No changes to commit for session {session_id}")
            return None

        try:
            project_path = f"{settings.PROJECTS_DIR}/{project_id}"
            repo = git.Repo(project_path)

            # Add all changed files
            for file_path in files_changed:
                full_path = os.path.join(project_path, file_path)
                if os.path.exists(full_path):
                    repo.index.add([file_path])

            # Generate commit message if not provided
            if not commit_message:
                commit_message = f"Auto-commit: {len(files_changed)} files changed"
                if len(files_changed) <= 3:
                    commit_message += f" ({', '.join(files_changed)})"

            # Commit changes
            commit = repo.index.commit(commit_message)

            # Push to remote
            origin = repo.remote(name='origin')
            origin.push()

            # Mark session as completed
            session["status"] = "completed"
            session["commit_sha"] = commit.hexsha

            # Get remote URL for commit
            remote_url = origin.url.replace('.git', f'/commit/{commit.hexsha}')

            github_commit = GitHubCommit(
                sha=commit.hexsha,
                message=commit.message,
                url=remote_url,
                files_changed=len(files_changed),
                timestamp=datetime.fromtimestamp(commit.committed_date)
            )

            logger.info(f"Successfully committed {len(files_changed)} files for session {session_id}")
            return github_commit

        except Exception as e:
            session["status"] = "failed"
            logger.error(f"Error committing changes for session {session_id}: {e}")
            raise Exception(f"Failed to commit changes: {str(e)}")

    def end_sync_session(self, session_id: str) -> Dict:
        """End a sync session and return summary"""
        if session_id not in self.sync_sessions:
            raise Exception(f"Sync session {session_id} not found")

        session = self.sync_sessions[session_id]
        session["end_time"] = datetime.now()

        summary = {
            "session_id": session_id,
            "project_id": session["project_id"],
            "files_changed": len(session["files_changed"]),
            "duration": (session["end_time"] - session["start_time"]).total_seconds(),
            "status": session["status"]
        }

        # Clean up session
        del self.sync_sessions[session_id]

        return summary

    async def get_repository_info(self, repo_url: str) -> GitHubRepo:
        """Get information about a GitHub repository"""
        try:
            # Extract owner and repo name from URL
            if repo_url.endswith('.git'):
                repo_url = repo_url[:-4]

            parts = repo_url.replace('https://github.com/', '').split('/')
            if len(parts) != 2:
                raise Exception("Invalid GitHub repository URL")

            owner, name = parts
            repo = self.github.get_repo(f"{owner}/{name}")

            return GitHubRepo(
                name=repo.name,
                owner=repo.owner.login,
                url=repo.clone_url,
                private=repo.private,
                description=repo.description
            )
        except Exception as e:
            logger.error(f"Error getting repository info: {e}")
            raise Exception(f"Failed to get repository info: {str(e)}")

    def get_user_repositories(self, page: int = 1, per_page: int = 30) -> List[GitHubRepo]:
        """Get user's GitHub repositories"""
        try:
            repos = self.user.get_repos(
                type='all',
                sort='updated',
                direction='desc'
            )

            # Paginate results
            start = (page - 1) * per_page
            end = start + per_page

            repo_list = []
            for i, repo in enumerate(repos):
                if i < start:
                    continue
                if i >= end:
                    break

                repo_list.append(GitHubRepo(
                    name=repo.name,
                    owner=repo.owner.login,
                    url=repo.clone_url,
                    private=repo.private,
                    description=repo.description
                ))

            return repo_list
        except Exception as e:
            logger.error(f"Error getting user repositories: {e}")
            raise Exception(f"Failed to get repositories: {str(e)}")
```

### Acceptance Criteria

- [x] GitHub service integrated with PyGithub
- [x] Repository creation with template support
- [x] Repository import/cloning functionality
- [x] Sync session tracking for batch commits
- [x] Auto-commit functionality with file tracking

---

## 📋 Ticket 8: GitHub API Endpoints in Agent

**Priority:** High  
**Estimated Effort:** 3 hours

### Description

Create FastAPI endpoints in the Python agent for GitHub operations, including repo creation, import, and commit management.

### Files to Create/Update

```
agent/app/api/endpoints/github.py
agent/app/main.py (update to include GitHub router)
```

### Implementation Details

**agent/app/api/endpoints/github.py** - GitHub API endpoints:

```python
from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List
from app.services.github_service import GitHubService
from app.models.github import (
    CreateRepoRequest, ImportRepoRequest, GitHubRepo,
    GitHubCommit, CommitChangesRequest
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_github_service(github_token: str) -> GitHubService:
    """Create GitHub service with token"""
    return GitHubService(github_token)

@router.post("/github/create-repo")
async def create_repository(
    request: CreateRepoRequest,
    github_token: str = Header(..., alias="X-GitHub-Token")
) -> GitHubRepo:
    """Create a new GitHub repository"""
    try:
        github_service = get_github_service(github_token)
        repo = await github_service.create_repository(request)
        return repo
    except Exception as e:
        logger.error(f"Error creating repository: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github/import-repo")
async def import_repository(
    request: ImportRepoRequest,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """Import a GitHub repository to a project"""
    try:
        github_service = get_github_service(github_token)
        project_path = await github_service.import_repository(request)
        return {
            "success": True,
            "project_id": request.project_id,
            "project_path": project_path
        }
    except Exception as e:
        logger.error(f"Error importing repository: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github/start-session")
async def start_sync_session(
    project_id: int,
    session_id: str,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """Start a new sync session for tracking changes"""
    try:
        github_service = get_github_service(github_token)
        github_service.start_sync_session(project_id, session_id)
        return {
            "success": True,
            "session_id": session_id,
            "project_id": project_id
        }
    except Exception as e:
        logger.error(f"Error starting sync session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github/track-change")
async def track_file_change(
    session_id: str,
    file_path: str,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """Track a file change in the current sync session"""
    try:
        github_service = get_github_service(github_token)
        github_service.track_file_change(session_id, file_path)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking file change: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github/commit-session")
async def commit_session_changes(
    session_id: str,
    commit_message: Optional[str] = None,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """Commit all changes from a sync session"""
    try:
        github_service = get_github_service(github_token)
        commit = await github_service.commit_session_changes(session_id, commit_message)

        # End the session
        summary = github_service.end_sync_session(session_id)

        return {
            "success": True,
            "commit": commit.dict() if commit else None,
            "session_summary": summary
        }
    except Exception as e:
        logger.error(f"Error committing session changes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/github/repo-info")
async def get_repository_info(
    repo_url: str,
    github_token: str = Header(..., alias="X-GitHub-Token")
) -> GitHubRepo:
    """Get information about a GitHub repository"""
    try:
        github_service = get_github_service(github_token)
        repo_info = await github_service.get_repository_info(repo_url)
        return repo_info
    except Exception as e:
        logger.error(f"Error getting repository info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/github/user-repos")
async def get_user_repositories(
    page: int = 1,
    per_page: int = 30,
    github_token: str = Header(..., alias="X-GitHub-Token")
) -> List[GitHubRepo]:
    """Get user's GitHub repositories"""
    try:
        github_service = get_github_service(github_token)
        repos = github_service.get_user_repositories(page, per_page)
        return repos
    except Exception as e:
        logger.error(f"Error getting user repositories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/github/health")
async def github_health():
    """GitHub service health check"""
    return {"status": "healthy", "service": "github"}
```

**agent/app/main.py** - Update to include GitHub router:

```python
# Add this import
from app.api.endpoints import github

# Add this line after existing routers
app.include_router(github.router, prefix="/api", tags=["github"])
```

### Acceptance Criteria

- [x] GitHub endpoints created in Python agent
- [x] Repository operations available via API
- [x] Sync session management endpoints
- [x] Token-based authentication for GitHub operations

---

## 📋 Ticket 9: Integrate GitHub Auto-Commit in Agent Workflow

**Priority:** High  
**Estimated Effort:** 4 hours

### Description

Integrate GitHub auto-commit functionality into the existing agent workflow, so file changes made by the AI are automatically tracked and committed at session end.

### Files to Update

```
agent/app/core/agent.py
agent/app/core/actions.py
agent/app/services/webhook_service.py
```

### Implementation Details

**agent/app/core/agent.py** - Update to integrate GitHub tracking:

```python
# Add imports
from app.services.github_service import GitHubService
from typing import Optional

class Agent:
    def __init__(self):
        # ... existing initialization
        self.github_service: Optional[GitHubService] = None
        self.current_session_id: Optional[str] = None
        self.github_token: Optional[str] = None

    def set_github_integration(self, github_token: str, session_id: str):
        """Enable GitHub integration for this agent session"""
        self.github_token = github_token
        self.github_service = GitHubService(github_token)
        self.current_session_id = session_id

        # Start sync session
        if self.github_service:
            self.github_service.start_sync_session(self.project_id, session_id)

    async def process_request(self, request: ChatRequest) -> None:
        """Enhanced to support GitHub integration"""
        try:
            # ... existing code for processing request

            # Check if GitHub integration should be enabled
            if request.github_token and request.session_id:
                self.set_github_integration(request.github_token, request.session_id)

            # ... rest of existing processing logic

        except Exception as e:
            # ... existing error handling

            # If we have GitHub integration and session fails, mark session as failed
            if self.github_service and self.current_session_id:
                try:
                    session_summary = self.github_service.end_sync_session(self.current_session_id)
                    session_summary["status"] = "failed"
                except:
                    pass  # Don't fail the main error handling

            raise e

    async def finalize_session(self, commit_message: Optional[str] = None):
        """Finalize the session and commit changes to GitHub if enabled"""
        if self.github_service and self.current_session_id:
            try:
                # Commit session changes
                commit = await self.github_service.commit_session_changes(
                    self.current_session_id,
                    commit_message
                )

                # Send webhook about commit
                if commit and self.webhook_service:
                    await self.webhook_service.send_commit(
                        self.project_id,
                        commit.sha,
                        commit.message,
                        commit.files_changed
                    )

                # End session
                session_summary = self.github_service.end_sync_session(self.current_session_id)

                # Send completion webhook with GitHub info
                if self.webhook_service:
                    await self.webhook_service.send_completion(
                        self.project_id,
                        len(self.iteration_results),
                        self.total_tokens,
                        github_commit=commit.dict() if commit else None,
                        session_summary=session_summary
                    )

            except Exception as e:
                logger.error(f"Error finalizing GitHub session: {e}")
                # Still send completion webhook even if GitHub fails
                if self.webhook_service:
                    await self.webhook_service.send_completion(
                        self.project_id,
                        len(self.iteration_results),
                        self.total_tokens
                    )
```

**agent/app/core/actions.py** - Update to track file changes:

```python
# Update ActionExecutor class
class ActionExecutor:
    def __init__(self, project_id: int, github_service: Optional[GitHubService] = None, session_id: Optional[str] = None):
        self.project_id = project_id
        self.github_service = github_service
        self.session_id = session_id

    async def execute_action(self, action: Action) -> ActionExecutionResult:
        """Enhanced to track GitHub file changes"""
        try:
            # ... existing action execution logic

            result = await self._execute_single_action(action)

            # Track file changes for GitHub if enabled
            if (self.github_service and self.session_id and
                action.type in ['create_file', 'edit_file', 'create_directory']):
                try:
                    file_path = action.filePath
                    if file_path and not file_path.startswith('/'):
                        # Track relative file path
                        self.github_service.track_file_change(self.session_id, file_path)
                except Exception as e:
                    logger.warning(f"Error tracking file change for GitHub: {e}")
                    # Don't fail the action if GitHub tracking fails

            return result

        except Exception as e:
            # ... existing error handling
            raise e
```

**agent/app/services/webhook_service.py** - Add commit webhook:

```python
# Add new method to WebhookService class
async def send_commit(
    self,
    project_id: int,
    commit_sha: str,
    commit_message: str,
    files_changed: int
) -> bool:
    """Send commit information to Next.js via webhook"""
    webhook_url = f"{self.base_url}/api/projects/{project_id}/webhook/commit"

    payload = {
        "commit_sha": commit_sha,
        "commit_message": commit_message,
        "files_changed": files_changed,
        "timestamp": datetime.now().isoformat()
    }

    return await self._send_webhook(webhook_url, payload, "commit")

# Update send_completion method to include GitHub info
async def send_completion(
    self,
    project_id: int,
    total_actions: int,
    total_tokens: int,
    github_commit: Optional[dict] = None,
    session_summary: Optional[dict] = None
) -> bool:
    """Send completion information with optional GitHub data"""
    webhook_url = f"{self.base_url}/api/projects/{project_id}/webhook/complete"

    payload = {
        "total_actions": total_actions,
        "total_tokens": total_tokens,
        "timestamp": datetime.now().isoformat()
    }

    if github_commit:
        payload["github_commit"] = github_commit

    if session_summary:
        payload["session_summary"] = session_summary

    return await self._send_webhook(webhook_url, payload, "completion")
```

### Acceptance Criteria

- [x] GitHub integration embedded in agent workflow
- [x] File changes automatically tracked during AI operations
- [x] Session-based commit functionality
- [x] Webhook notifications for commits
- [x] Graceful handling when GitHub integration disabled

---

## 📋 Ticket 10: Next.js GitHub Integration Endpoints

**Priority:** Medium  
**Estimated Effort:** 3 hours

### Description

Create Next.js API endpoints to proxy GitHub operations to the Python agent and handle GitHub-related webhooks.

### Files to Create/Update

```
app/api/projects/[id]/github/create-repo/route.ts
app/api/projects/[id]/github/import/route.ts
app/api/projects/[id]/webhook/commit/route.ts
app/api/auth/github/status/route.ts
app/api/auth/github/disconnect/route.ts
```

### Implementation Details

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

### Acceptance Criteria

- [x] GitHub repository operations available via Next.js API
- [x] Project-GitHub linking in database
- [x] Commit webhook handling
- [x] GitHub connection management endpoints

## 🎯 Summary

This comprehensive plan covers:

**Phase 1: Preview Migration (Tickets 1-4)**

- Move Docker container management from Next.js to Python agent
- Create clean API proxy layer in Next.js
- Remove old preview logic

**Phase 2: GitHub Integration (Tickets 5-10)**

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

---

## 📋 Ticket 11: GitHub Branch Management & Pull Request UI

**Priority:** High  
**Estimated Effort:** 5 hours

### Description

Add UI components to the project detail view that show the current Git branch, display uncommitted changes, and provide functionality to create pull requests directly from the interface.

### Files to Create/Update

```
app/(logged-in)/projects/[id]/components/github/
├── branch-indicator.tsx
├── changes-panel.tsx
├── pull-request-modal.tsx
└── github-status.tsx
app/(logged-in)/projects/[id]/page.tsx (update to include GitHub components)
app/api/projects/[id]/github/status/route.ts
app/api/projects/[id]/github/create-pr/route.ts
agent/app/api/endpoints/github.py (add branch and PR endpoints)
agent/app/services/github_service.py (add branch/PR methods)
```

### Implementation Details

**app/(logged-in)/projects/[id]/components/github/branch-indicator.tsx** - Branch status component:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, GitPullRequest, Loader2 } from 'lucide-react';
import { PullRequestModal } from './pull-request-modal';

interface BranchStatus {
  current_branch: string;
  has_uncommitted_changes: boolean;
  commits_ahead: number;
  commits_behind: number;
  last_commit_sha: string;
  last_commit_message: string;
}

interface BranchIndicatorProps {
  projectId: number;
}

export function BranchIndicator({ projectId }: BranchIndicatorProps) {
  const [status, setStatus] = useState<BranchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPRModal, setShowPRModal] = useState(false);

  useEffect(() => {
    fetchBranchStatus();
  }, [projectId]);

  async function fetchBranchStatus() {
    try {
      const response = await fetch(`/api/projects/${projectId}/github/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching branch status:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading branch info...
      </div>
    );
  }

  if (!status) {
    return <div className="text-sm text-muted-foreground">No Git repository connected</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4" />
        <Badge variant="secondary" className="font-mono">
          {status.current_branch}
        </Badge>
      </div>

      {status.has_uncommitted_changes && (
        <Badge variant="destructive" className="text-xs">
          Uncommitted changes
        </Badge>
      )}

      {status.commits_ahead > 0 && (
        <Badge variant="default" className="text-xs">
          {status.commits_ahead} ahead
        </Badge>
      )}

      {status.commits_behind > 0 && (
        <Badge variant="outline" className="text-xs">
          {status.commits_behind} behind
        </Badge>
      )}

      {status.commits_ahead > 0 && !status.has_uncommitted_changes && (
        <Button onClick={() => setShowPRModal(true)} size="sm" variant="outline" className="ml-2">
          <GitPullRequest className="w-4 h-4 mr-2" />
          Create PR
        </Button>
      )}

      <PullRequestModal
        projectId={projectId}
        isOpen={showPRModal}
        onClose={() => setShowPRModal(false)}
        currentBranch={status.current_branch}
        commitsAhead={status.commits_ahead}
      />
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/github/pull-request-modal.tsx** - PR creation modal:

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GitPullRequest, ExternalLink } from 'lucide-react';

interface PullRequestModalProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  currentBranch: string;
  commitsAhead: number;
}

export function PullRequestModal({
  projectId,
  isOpen,
  onClose,
  currentBranch,
  commitsAhead,
}: PullRequestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ url: string } | null>(null);

  async function handleCreatePR() {
    if (!title.trim()) {
      setError('PR title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/github/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          head: currentBranch,
          base: targetBranch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create pull request');
      }

      const data = await response.json();
      setSuccess({ url: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setTitle('');
      setDescription('');
      setTargetBranch('main');
      setError(null);
      setSuccess(null);
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5" />
            Create Pull Request
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>Pull request created successfully!</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={() => window.open(success.url, '_blank')} className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on GitHub
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">From:</Label>
                <div className="font-mono">{currentBranch}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">To:</Label>
                <Input
                  value={targetBranch}
                  onChange={e => setTargetBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {commitsAhead} commit{commitsAhead !== 1 ? 's' : ''} ahead
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-title">Title *</Label>
              <Input
                id="pr-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Add new feature..."
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-description">Description</Label>
              <Textarea
                id="pr-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the changes in this pull request..."
                rows={3}
                disabled={loading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreatePR}
                disabled={loading || !title.trim()}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Pull Request'}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**app/api/projects/[id]/github/status/route.ts** - GitHub branch status:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGitHubToken } from '@/lib/github/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const githubToken = await getGitHubToken(session.user.id);

    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/github/branch-status/${projectId}`, {
      headers: {
        'X-GitHub-Token': githubToken,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to get branch status', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting GitHub branch status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/github/create-pr/route.ts** - Create pull request:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGitHubToken } from '@/lib/github/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();
    const githubToken = await getGitHubToken(session.user.id);

    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/github/create-pull-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Token': githubToken,
      },
      body: JSON.stringify({
        project_id: projectId,
        ...body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to create pull request', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating pull request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Acceptance Criteria

- [x] Branch indicator showing current branch in project view
- [x] Visual indicators for uncommitted changes and commits ahead/behind
- [x] Pull request creation modal with title/description
- [x] Success state with link to created PR on GitHub
- [x] Error handling for PR creation failures

---

## 📋 Ticket 12: Replace Authentication with Clerk

**Priority:** Critical  
**Estimated Effort:** 6 hours

### Description

Remove the current authentication system and replace it entirely with Clerk. This includes updating all auth-related imports, middleware, session handling, and user management throughout the application.

### Files to Update/Replace

```
lib/auth/ (entire directory - REPLACE)
middleware.ts (update)
app/layout.tsx (update providers)
app/providers.tsx (update)
components/auth/ (update for Clerk)
All files importing from @/lib/auth (update imports)
package.json (add Clerk dependencies)
.env.local (add Clerk environment variables)
```

### Implementation Details

**package.json** - Add Clerk dependencies:

```json
{
  "dependencies": {
    "@clerk/nextjs": "^4.29.0",
    "@clerk/themes": "^1.7.9"
  }
}
```

**.env.local** - Clerk environment variables:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/projects
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/projects
```

**lib/auth/index.tsx** - Replace with Clerk utilities:

```typescript
import { auth as clerkAuth, currentUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export { clerkAuth as auth };

export async function requireAuth() {
  const { userId } = clerkAuth();
  if (!userId) {
    redirect('/sign-in');
  }
  return userId;
}

export async function getCurrentUser() {
  return await currentUser();
}

export async function getUserId() {
  const { userId } = clerkAuth();
  return userId;
}
```

**middleware.ts** - Update for Clerk:

```typescript
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)', '/home', '/waitlist'],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: ['/api/webhooks/clerk', '/api/webhooks/stripe'],
});

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  // for more information about configuring your Middleware
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

**app/layout.tsx** - Update with ClerkProvider:

```tsx
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#0a0a0a',
          colorInputBackground: '#1a1a1a',
          colorInputText: '#ffffff',
        },
        elements: {
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
          card: 'bg-gray-900 border-gray-800',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**app/(logged-in)/layout.tsx** - Update authentication check:

```tsx
import { requireAuth } from '@/lib/auth';
import { Navbar } from '@/components/ui/navbar';

export default async function LoggedInLayout({ children }: { children: React.ReactNode }) {
  // This will redirect to sign-in if not authenticated
  await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

**app/(logged-out)/sign-in/page.tsx** - Clerk SignIn component:

```tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-gray-900 border-gray-800',
          },
        }}
      />
    </div>
  );
}
```

**app/(logged-out)/sign-up/page.tsx** - Clerk SignUp component:

```tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-gray-900 border-gray-800',
          },
        }}
      />
    </div>
  );
}
```

**components/ui/navbar.tsx** - Update with Clerk UserButton:

```tsx
import { UserButton, currentUser } from '@clerk/nextjs';
import Link from 'next/link';

export async function Navbar() {
  const user = await currentUser();

  return (
    <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/projects" className="text-xl font-bold">
          Kosuke
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.emailAddresses[0]?.emailAddress}</span>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
                userButtonPopoverCard: 'bg-gray-900 border-gray-800',
                userButtonPopoverActions: 'bg-gray-900',
              },
            }}
            afterSignOutUrl="/"
          />
        </div>
      </div>
    </nav>
  );
}
```

**lib/github/auth.ts** - Update for Clerk user IDs:

```typescript
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { userGithubTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface GitHubTokenInfo {
  access_token: string;
  scope: string;
  token_type: string;
}

export async function storeGitHubToken(tokenInfo: GitHubTokenInfo, username: string) {
  const { userId } = auth();
  if (!userId) throw new Error('Not authenticated');

  await db
    .insert(userGithubTokens)
    .values({
      userId,
      githubToken: tokenInfo.access_token,
      githubUsername: username,
      tokenScope: tokenInfo.scope.split(','),
    })
    .onConflictDoUpdate({
      target: userGithubTokens.userId,
      set: {
        githubToken: tokenInfo.access_token,
        githubUsername: username,
        tokenScope: tokenInfo.scope.split(','),
        updatedAt: new Date(),
      },
    });
}

export async function getGitHubToken(): Promise<string | null> {
  const { userId } = auth();
  if (!userId) return null;

  const result = await db
    .select()
    .from(userGithubTokens)
    .where(eq(userGithubTokens.userId, userId))
    .limit(1);
  return result[0]?.githubToken || null;
}

export async function getUserGitHubInfo() {
  const { userId } = auth();
  if (!userId) return null;

  const result = await db
    .select()
    .from(userGithubTokens)
    .where(eq(userGithubTokens.userId, userId))
    .limit(1);
  return result[0] || null;
}

export async function disconnectGitHub() {
  const { userId } = auth();
  if (!userId) throw new Error('Not authenticated');

  await db.delete(userGithubTokens).where(eq(userGithubTokens.userId, userId));
}
```

**Migration script for existing auth imports:**

```bash
# Find and replace auth imports throughout the codebase
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/import { auth } from.*auth.*/import { auth } from "@clerk\/nextjs";/g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/session\.user\.id/userId/g'
```

### Acceptance Criteria

- [x] Clerk fully integrated and configured
- [x] All existing auth logic replaced with Clerk
- [x] Sign-in/sign-up pages using Clerk components
- [x] Middleware updated for Clerk route protection
- [x] User profile management via Clerk UserButton
- [x] GitHub token storage updated for Clerk user IDs
- [x] No broken auth imports remain

---

## 🎯 Updated Summary

This comprehensive plan now covers:

**Phase 1: Preview Migration (Tickets 1-4)**

- Move Docker container management from Next.js to Python agent
- Create clean API proxy layer in Next.js
- Remove old preview logic

**Phase 2: GitHub Integration (Tickets 5-10)**

- OAuth integration with Clerk
- Repository creation and import
- Auto-commit with session-based checkpoints
- Complete webhook integration

**Phase 3: Enhanced GitHub UI & Modern Auth (Tickets 11-12)**

- Branch management and pull request creation UI
- Complete Clerk authentication migration

**Total Estimated Effort:** ~41 hours

**Benefits:**
✅ Lean Next.js focused on frontend  
✅ Modern Clerk authentication  
✅ Complete GitHub workflow with PR creation  
✅ Centralized agent handling all operations  
✅ Auto-commit with visual branch management  
✅ Clean separation of concerns

---

## 📋 Ticket 13: Checkpoint Revert System

**Priority:** High  
**Estimated Effort:** 6 hours

### Description

Implement a checkpoint/revert system that allows users to view all previous AI sessions (checkpoints) and revert the project to any previous state. Each AI session creates a checkpoint, and users can roll back through the chat interface.

### Files to Create/Update

```
app/(logged-in)/projects/[id]/components/chat/
├── checkpoint-panel.tsx
├── checkpoint-modal.tsx
└── revert-confirmation.tsx
app/(logged-in)/projects/[id]/components/layout/project-content.tsx (update)
app/api/projects/[id]/checkpoints/route.ts
app/api/projects/[id]/revert/route.ts
agent/app/api/endpoints/checkpoints.py
agent/app/services/checkpoint_service.py
agent/app/models/checkpoint.py
lib/db/schema.ts (add checkpoint tables)
```

### Implementation Details

**lib/db/schema.ts** - Add checkpoint tracking:

```typescript
// Add to existing schema
export const projectCheckpoints = pgTable('project_checkpoints', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  checkpointName: text('checkpoint_name'),
  description: text('description'),
  filesSnapshot: text('files_snapshot'), // JSON array of file paths at this checkpoint
  commitSha: text('commit_sha'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: text('created_by').notNull(), // user ID
});

export const projectCheckpointFiles = pgTable('project_checkpoint_files', {
  id: serial('id').primaryKey(),
  checkpointId: integer('checkpoint_id')
    .notNull()
    .references(() => projectCheckpoints.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  fileContent: text('file_content').notNull(),
  fileHash: text('file_hash').notNull(),
});
```

**app/(logged-in)/projects/[id]/components/chat/checkpoint-panel.tsx** - Checkpoint UI:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, RotateCcw, Clock, GitCommit } from 'lucide-react';
import { CheckpointModal } from './checkpoint-modal';
import { RevertConfirmation } from './revert-confirmation';
import { formatDistanceToNow } from 'date-fns';

interface Checkpoint {
  id: number;
  session_id: string;
  checkpoint_name: string;
  description: string;
  commit_sha?: string;
  created_at: string;
  files_count: number;
  is_current: boolean;
}

interface CheckpointPanelProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CheckpointPanel({ projectId, isOpen, onClose }: CheckpointPanelProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [showRevertModal, setShowRevertModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCheckpoints();
    }
  }, [isOpen, projectId]);

  async function fetchCheckpoints() {
    try {
      const response = await fetch(`/api/projects/${projectId}/checkpoints`);
      if (response.ok) {
        const data = await response.json();
        setCheckpoints(data.checkpoints);
      }
    } catch (error) {
      console.error('Error fetching checkpoints:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleRevert(checkpoint: Checkpoint) {
    setSelectedCheckpoint(checkpoint);
    setShowRevertModal(true);
  }

  async function confirmRevert() {
    if (!selectedCheckpoint) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpoint_id: selectedCheckpoint.id,
          session_id: selectedCheckpoint.session_id,
        }),
      });

      if (response.ok) {
        // Refresh checkpoints and close modals
        await fetchCheckpoints();
        setShowRevertModal(false);
        setSelectedCheckpoint(null);
        // Optionally trigger a page refresh or emit event
        window.location.reload();
      }
    } catch (error) {
      console.error('Error reverting to checkpoint:', error);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <h3 className="font-semibold">Checkpoints</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      <ScrollArea className="h-full p-4">
        {loading ? (
          <div className="text-center text-muted-foreground">Loading checkpoints...</div>
        ) : checkpoints.length === 0 ? (
          <div className="text-center text-muted-foreground">No checkpoints yet</div>
        ) : (
          <div className="space-y-3">
            {checkpoints.map(checkpoint => (
              <div
                key={checkpoint.id}
                className={`p-3 rounded-lg border ${
                  checkpoint.is_current
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">
                      {checkpoint.checkpoint_name || 'Unnamed Session'}
                    </h4>
                    {checkpoint.description && (
                      <p className="text-sm text-muted-foreground mt-1">{checkpoint.description}</p>
                    )}
                  </div>
                  {checkpoint.is_current && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(checkpoint.created_at), { addSuffix: true })}
                  </div>
                  <div>{checkpoint.files_count} files</div>
                  {checkpoint.commit_sha && (
                    <div className="flex items-center gap-1">
                      <GitCommit className="w-3 h-3" />
                      {checkpoint.commit_sha.slice(0, 7)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCheckpoint(checkpoint)}
                  >
                    View Details
                  </Button>
                  {!checkpoint.is_current && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevert(checkpoint)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Revert
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <CheckpointModal
        checkpoint={selectedCheckpoint}
        isOpen={!!selectedCheckpoint && !showRevertModal}
        onClose={() => setSelectedCheckpoint(null)}
      />

      <RevertConfirmation
        checkpoint={selectedCheckpoint}
        isOpen={showRevertModal}
        onConfirm={confirmRevert}
        onCancel={() => {
          setShowRevertModal(false);
          setSelectedCheckpoint(null);
        }}
      />
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/chat/revert-confirmation.tsx** - Revert confirmation:

```tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Checkpoint {
  id: number;
  checkpoint_name: string;
  description: string;
  created_at: string;
  files_count: number;
}

interface RevertConfirmationProps {
  checkpoint: Checkpoint | null;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RevertConfirmation({
  checkpoint,
  isOpen,
  onConfirm,
  onCancel,
}: RevertConfirmationProps) {
  if (!checkpoint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Revert to Checkpoint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action will permanently overwrite your current project state with the selected
              checkpoint. All changes made after this checkpoint will be lost.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Checkpoint Details:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>
                <strong>Name:</strong> {checkpoint.checkpoint_name || 'Unnamed Session'}
              </div>
              <div>
                <strong>Created:</strong> {new Date(checkpoint.created_at).toLocaleString()}
              </div>
              <div>
                <strong>Files:</strong> {checkpoint.files_count} files
              </div>
              {checkpoint.description && (
                <div>
                  <strong>Description:</strong> {checkpoint.description}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**app/api/projects/[id]/checkpoints/route.ts** - Checkpoint API:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectCheckpoints } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);

    // Get all checkpoints for this project
    const checkpoints = await db
      .select()
      .from(projectCheckpoints)
      .where(eq(projectCheckpoints.projectId, projectId))
      .orderBy(desc(projectCheckpoints.createdAt));

    // Mark the most recent as current
    const checkpointsWithStatus = checkpoints.map((checkpoint, index) => ({
      ...checkpoint,
      is_current: index === 0,
      files_count: JSON.parse(checkpoint.filesSnapshot || '[]').length,
    }));

    return NextResponse.json({ checkpoints: checkpointsWithStatus });
  } catch (error) {
    console.error('Error fetching checkpoints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**app/api/projects/[id]/revert/route.ts** - Revert functionality:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);
    const body = await request.json();

    // Proxy to Python agent for revert operation
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/checkpoints/revert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        checkpoint_id: body.checkpoint_id,
        session_id: body.session_id,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to revert to checkpoint', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reverting to checkpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Acceptance Criteria

- [x] Checkpoint panel showing all previous AI sessions
- [x] Visual indicators for current checkpoint and file counts
- [x] Revert confirmation dialog with warning
- [x] Complete project state restoration from checkpoint
- [x] Checkpoint creation on each AI session completion

---

## 📋 Ticket 14: Database Management Tab

**Priority:** Medium  
**Estimated Effort:** 5 hours

### Description

Add a database management tab to the project detail view that allows users to view their project's database schema, browse table data, and execute simple queries. Each project has its own SQLite database, and operations should be proxied through the Python microservice for security and consistency.

### Files to Create/Update

```
app/(logged-in)/projects/[id]/components/database/
├── database-tab.tsx
├── schema-viewer.tsx
├── table-browser.tsx
├── query-runner.tsx
└── connection-status.tsx
app/(logged-in)/projects/[id]/page.tsx (add database tab)
app/api/projects/[id]/database/schema/route.ts
app/api/projects/[id]/database/tables/[table]/route.ts
app/api/projects/[id]/database/query/route.ts
agent/app/api/endpoints/database.py
agent/app/services/database_service.py
agent/app/models/database.py
```

### Implementation Details

**app/(logged-in)/projects/[id]/components/database/database-tab.tsx** - Main database interface:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Table, Search, Play } from 'lucide-react';
import { SchemaViewer } from './schema-viewer';
import { TableBrowser } from './table-browser';
import { QueryRunner } from './query-runner';
import { ConnectionStatus } from './connection-status';

interface DatabaseTabProps {
  projectId: number;
}

interface DatabaseInfo {
  connected: boolean;
  database_path: string;
  tables_count: number;
  database_size: string;
}

export function DatabaseTab({ projectId }: DatabaseTabProps) {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatabaseInfo();
  }, [projectId]);

  async function fetchDatabaseInfo() {
    try {
      const response = await fetch(`/api/projects/${projectId}/database/info`);
      if (response.ok) {
        const data = await response.json();
        setDbInfo(data);
      }
    } catch (error) {
      console.error('Error fetching database info:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading database information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Project Database
              </CardTitle>
              <CardDescription>Manage your project's SQLite database</CardDescription>
            </div>
            <ConnectionStatus connected={dbInfo?.connected || false} />
          </div>
        </CardHeader>
        <CardContent>
          {dbInfo && (
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {dbInfo.tables_count} table{dbInfo.tables_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Size: {dbInfo.database_size}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={dbInfo.connected ? 'default' : 'destructive'} className="text-xs">
                  {dbInfo.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="schema" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Browse Data
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Query
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-6">
          <SchemaViewer projectId={projectId} />
        </TabsContent>

        <TabsContent value="browse" className="mt-6">
          <TableBrowser projectId={projectId} />
        </TabsContent>

        <TabsContent value="query" className="mt-6">
          <QueryRunner projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**app/(logged-in)/projects/[id]/components/database/schema-viewer.tsx** - Database schema display:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Key, Hash, Type } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key?: string;
}

interface TableSchema {
  name: string;
  columns: Column[];
  row_count: number;
}

interface SchemaViewerProps {
  projectId: number;
}

export function SchemaViewer({ projectId }: SchemaViewerProps) {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchema();
  }, [projectId]);

  async function fetchSchema() {
    try {
      const response = await fetch(`/api/projects/${projectId}/database/schema`);
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Error fetching schema:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading schema...</div>;
  }

  if (tables.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">No tables found in database</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tables.map(table => (
        <Card key={table.name}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                {table.name}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {table.row_count} rows
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {table.columns.map(column => (
                  <div
                    key={column.name}
                    className="flex items-center justify-between p-2 rounded border border-gray-800 bg-gray-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {column.primary_key && <Key className="w-3 h-3 text-yellow-500" />}
                        {column.foreign_key && <Hash className="w-3 h-3 text-blue-500" />}
                        <Type className="w-3 h-3 text-gray-400" />
                      </div>
                      <div>
                        <div className="font-mono text-sm">{column.name}</div>
                        {column.foreign_key && (
                          <div className="text-xs text-muted-foreground">
                            → {column.foreign_key}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {column.type}
                      </Badge>
                      {!column.nullable && (
                        <Badge variant="destructive" className="text-xs">
                          NOT NULL
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**app/api/projects/[id]/database/schema/route.ts** - Database schema API:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = parseInt(params.id);

    // Proxy to Python agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${agentUrl}/api/database/schema/${projectId}`);

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch database schema', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching database schema:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**agent/app/services/database_service.py** - Database operations service:

```python
import sqlite3
import os
from typing import List, Dict, Any, Optional
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self, project_id: int):
        self.project_id = project_id
        self.db_path = f"{settings.PROJECTS_DIR}/{project_id}/database.sqlite"

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        if not os.path.exists(self.db_path):
            # Create database if it doesn't exist
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            conn.close()

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    async def get_database_info(self) -> Dict[str, Any]:
        """Get basic database information"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Get table count
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
            tables_count = cursor.fetchone()[0]

            # Get database size
            db_size = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
            db_size_str = f"{db_size / 1024:.1f} KB" if db_size < 1024*1024 else f"{db_size / (1024*1024):.1f} MB"

            conn.close()

            return {
                "connected": True,
                "database_path": self.db_path,
                "tables_count": tables_count,
                "database_size": db_size_str
            }
        except Exception as e:
            logger.error(f"Error getting database info: {e}")
            return {
                "connected": False,
                "database_path": self.db_path,
                "tables_count": 0,
                "database_size": "0 KB"
            }

    async def get_schema(self) -> Dict[str, Any]:
        """Get database schema information"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            table_names = [row[0] for row in cursor.fetchall()]

            tables = []
            for table_name in table_names:
                # Get table info
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns_info = cursor.fetchall()

                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                row_count = cursor.fetchone()[0]

                # Get foreign keys
                cursor.execute(f"PRAGMA foreign_key_list({table_name})")
                foreign_keys = {row[3]: f"{row[2]}.{row[4]}" for row in cursor.fetchall()}

                columns = []
                for col in columns_info:
                    columns.append({
                        "name": col[1],
                        "type": col[2],
                        "nullable": not col[3],
                        "primary_key": bool(col[5]),
                        "foreign_key": foreign_keys.get(col[1])
                    })

                tables.append({
                    "name": table_name,
                    "columns": columns,
                    "row_count": row_count
                })

            conn.close()
            return {"tables": tables}

        except Exception as e:
            logger.error(f"Error getting database schema: {e}")
            raise Exception(f"Failed to get database schema: {str(e)}")

    async def get_table_data(self, table_name: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get data from a specific table"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Validate table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                raise Exception(f"Table '{table_name}' does not exist")

            # Get total count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            total_rows = cursor.fetchone()[0]

            # Get data with pagination
            cursor.execute(f"SELECT * FROM {table_name} LIMIT ? OFFSET ?", (limit, offset))
            rows = cursor.fetchall()

            # Convert to list of dicts
            data = [dict(row) for row in rows]

            conn.close()

            return {
                "table_name": table_name,
                "total_rows": total_rows,
                "returned_rows": len(data),
                "limit": limit,
                "offset": offset,
                "data": data
            }

        except Exception as e:
            logger.error(f"Error getting table data: {e}")
            raise Exception(f"Failed to get table data: {str(e)}")

    async def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute a SELECT query safely"""
        try:
            # Only allow SELECT queries for security
            query_upper = query.strip().upper()
            if not query_upper.startswith('SELECT'):
                raise Exception("Only SELECT queries are allowed")

            conn = self._get_connection()
            cursor = conn.cursor()

            cursor.execute(query)
            rows = cursor.fetchall()

            # Get column names
            columns = [description[0] for description in cursor.description] if cursor.description else []

            # Convert to list of dicts
            data = [dict(zip(columns, row)) for row in rows]

            conn.close()

            return {
                "columns": columns,
                "rows": len(data),
                "data": data,
                "query": query
            }

        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise Exception(f"Failed to execute query: {str(e)}")
```

### Acceptance Criteria

- [x] Database management tab in project detail view
- [x] Schema viewer showing tables, columns, and relationships
- [x] Table data browser with pagination
- [x] Safe query runner (SELECT only)
- [x] Connection status and database information
- [x] All operations proxied through Python microservice

---

## 🎯 Final Updated Summary

This comprehensive plan now covers:

**Phase 1: Preview Migration (Tickets 1-4)**

- Move Docker container management from Next.js to Python agent
- Create clean API proxy layer in Next.js
- Remove old preview logic

**Phase 2: GitHub Integration (Tickets 5-10)**

- OAuth integration with Clerk
- Repository creation and import
- Auto-commit with session-based checkpoints
- Complete webhook integration

**Phase 3: Enhanced UI & Modern Auth (Tickets 11-12)**

- Branch management and pull request creation UI
- Complete Clerk authentication migration

**Phase 4: Advanced Features (Tickets 13-14)**

- Checkpoint/revert system for session management
- Database management with schema viewer and query runner

**Total Estimated Effort:** ~52 hours

**Final Architecture Benefits:**
✅ **Ultra-lean Next.js** - pure frontend + auth + API proxy  
✅ **Modern Clerk authentication** - industry standard  
✅ **Complete GitHub workflow** - like Vercel's integration  
✅ **Visual branch management** - see status, create PRs instantly  
✅ **Checkpoint system** - revert to any previous state  
✅ **Database management** - full schema and data visibility  
✅ **Centralized Python agent** - all operations in one service  
✅ **Auto-commit with checkpoints** - intelligent batch commits  
✅ **Clean separation** - frontend, auth, and agent logic isolated

**To answer your question about database operations:** I recommend **proxying through the Python microservice** to maintain architectural consistency. The Python agent already has direct access to project files and databases, so it makes sense to centralize all project-related operations there. This keeps Next.js focused purely on frontend and authentication.

Ready to implement! 🚀
