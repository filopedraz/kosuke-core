# Migration Guide: From Filesystem Mounting to Database + Blob Storage

## Overview

This guide walks you through migrating from the filesystem mounting approach to a production-ready database + blob storage system for Digital Ocean.

## Key Benefits of the New Architecture

### ✅ **Production-Ready**
- No filesystem mounting complexity
- Scales across multiple hosts
- Compatible with container orchestration (Kubernetes, Docker Swarm)
- Works with Digital Ocean's managed services

### ✅ **Reliability**
- Database-backed file storage with transactions
- Automatic backups via Digital Ocean Spaces
- No volume mounting failures
- Consistent across environments

### ✅ **Scalability**
- Handles large files via blob storage
- Database connection pooling
- Can run on multiple servers
- Session isolation via API

### ✅ **Simplified Operations**
- No complex volume path resolution
- Eliminates Docker-in-Docker mounting issues
- API-based file access
- Clean container lifecycle management

## Architecture Comparison

### Old Architecture (Filesystem Mounting)
```
┌─────────────────┐    ┌──────────────────┐
│   Docker Host   │    │   Container      │
│                 │    │                  │
│  projects/      │◄──►│  /app (mounted)  │
│    1/           │    │                  │
│    sessions/    │    │                  │
│                 │    │                  │
└─────────────────┘    └──────────────────┘
```

### New Architecture (Database + Blob Storage)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Container     │    │   Agent API      │    │   PostgreSQL    │
│                 │    │                  │    │                 │
│  API calls  ────┼───►│  File Storage ───┼───►│  project_files  │
│                 │    │  Service         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Digital Ocean  │
                       │     Spaces      │
                       │  (Large Files)  │
                       └─────────────────┘
```

## Digital Ocean Setup

### 1. Create Digital Ocean Spaces Bucket

```bash
# Using doctl (Digital Ocean CLI)
doctl spaces buckets create kosuke-projects --region nyc3

# Or create via Digital Ocean Control Panel:
# Spaces → Create Space → Name: kosuke-projects → Region: NYC3
```

### 2. Generate Spaces Access Keys

1. Go to Digital Ocean Control Panel
2. API → Spaces Keys
3. Generate New Key
4. Save the Access Key ID and Secret Access Key

### 3. Database Setup

Use Digital Ocean Managed PostgreSQL:

```bash
# Create managed PostgreSQL database
doctl databases create kosuke-db --engine pg --region nyc3 --size db-s-1vcpu-1gb

# Or use your existing PostgreSQL instance
```

## Environment Configuration

### Update Environment Variables

Add these to your environment (`.env` or production config):

```bash
# Digital Ocean Spaces Configuration
DO_SPACES_ACCESS_KEY=your_access_key_here
DO_SPACES_SECRET_KEY=your_secret_key_here
DO_SPACES_REGION=nyc3
DO_SPACES_BUCKET=kosuke-projects

# Database Configuration
DB_HOST=your_db_host
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=kosuke

# API Configuration (for containers to call back)
API_BASE_URL=http://host.docker.internal:8000
```

## Migration Steps

### Step 1: Install Dependencies

```bash
# Add to requirements.txt
asyncpg==0.29.0
boto3==1.34.0
```

### Step 2: Database Migration

The database tables will be created automatically when the service starts. For existing data migration:

```python
# Optional: Migrate existing filesystem data to database
# Run this script once to migrate existing projects

import asyncio
from pathlib import Path
from app.services.file_storage_service import file_storage

async def migrate_existing_projects():
    projects_dir = Path("./projects")
    
    if not projects_dir.exists():
        print("No existing projects directory found")
        return
    
    await file_storage.initialize()
    
    for project_dir in projects_dir.iterdir():
        if project_dir.is_dir() and project_dir.name.isdigit():
            project_id = int(project_dir.name)
            print(f"Migrating project {project_id}")
            
            # Migrate main session
            await migrate_session_files(project_id, "main", project_dir)
            
            # Migrate chat sessions
            sessions_dir = project_dir / "sessions"
            if sessions_dir.exists():
                for session_dir in sessions_dir.iterdir():
                    if session_dir.is_dir():
                        await migrate_session_files(project_id, session_dir.name, session_dir)

async def migrate_session_files(project_id: int, session_id: str, session_path: Path):
    """Migrate files from filesystem to database storage"""
    for file_path in session_path.rglob("*"):
        if file_path.is_file() and not any(part.startswith('.git') for part in file_path.parts):
            relative_path = str(file_path.relative_to(session_path))
            
            try:
                content = file_path.read_text(encoding='utf-8')
                await file_storage.write_file(project_id, session_id, relative_path, content)
                print(f"  ✓ {relative_path}")
            except UnicodeDecodeError:
                print(f"  ✗ Skipped binary file: {relative_path}")

if __name__ == "__main__":
    asyncio.run(migrate_existing_projects())
```

### Step 3: Update Docker Service Usage

Replace the old DockerService with DockerServiceV2:

```python
# In your code, replace:
from app.services.docker_service import DockerService

# With:
from app.services.docker_service_v2 import DockerServiceV2 as DockerService
```

### Step 4: Container Image Updates

Update your container images to use the API for file access. Create a helper script in your containers:

```javascript
// kosuke-api-client.js - Add to your container images
class KosukeApiClient {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://host.docker.internal:8000';
    this.projectId = process.env.PROJECT_ID;
    this.sessionId = process.env.SESSION_ID;
  }

  async readFile(filePath) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/projects/${this.projectId}/sessions/${this.sessionId}/files/${filePath}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.content;
  }

  async writeFile(filePath, content) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/projects/${this.projectId}/sessions/${this.sessionId}/files/${filePath}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
    return response.ok;
  }

  async listFiles(prefix = '') {
    const response = await fetch(
      `${this.baseUrl}/api/v1/projects/${this.projectId}/sessions/${this.sessionId}/files?prefix=${prefix}`
    );
    return response.json();
  }
}

module.exports = KosukeApiClient;
```

### Step 5: Update Container Dockerfile

```dockerfile
# Update your container Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy API client
COPY kosuke-api-client.js /usr/local/lib/kosuke-api-client.js

# Create entrypoint script that initializes from API
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

```bash
#!/bin/bash
# entrypoint.sh - Initialize container from API

set -e

# Initialize project files from API
if [ "$KOSUKE_API_ENABLED" = "true" ]; then
  echo "Initializing project files from Kosuke API..."
  
  # Get package.json and install dependencies
  curl -s "$API_BASE_URL/api/v1/container/package-json?project_id=$PROJECT_ID&session_id=$SESSION_ID" \
    | jq -r '.content' > package.json
  
  npm install
  
  echo "Project initialized successfully"
fi

# Start the application
exec npm run dev
```

## Production Deployment

### 1. Digital Ocean App Platform

```yaml
# .do/app.yaml
name: kosuke-agent
services:
- name: agent
  source_dir: /agent
  github:
    repo: your-org/kosuke
    branch: main
  run_command: uvicorn app.main:app --host 0.0.0.0 --port 8080
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: DO_SPACES_ACCESS_KEY
    value: ${DO_SPACES_ACCESS_KEY}
  - key: DO_SPACES_SECRET_KEY
    value: ${DO_SPACES_SECRET_KEY}
  - key: DB_HOST
    value: ${DATABASE_URL}
databases:
- name: kosuke-db
  engine: PG
  production: true
```

### 2. Docker Compose for Self-Hosting

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  agent:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DO_SPACES_ACCESS_KEY=${DO_SPACES_ACCESS_KEY}
      - DO_SPACES_SECRET_KEY=${DO_SPACES_SECRET_KEY}
      - DO_SPACES_REGION=nyc3
      - DO_SPACES_BUCKET=kosuke-projects
      - DB_HOST=postgres
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=kosuke
    depends_on:
      - postgres
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=kosuke
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 3. Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kosuke-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kosuke-agent
  template:
    metadata:
      labels:
        app: kosuke-agent
    spec:
      containers:
      - name: agent
        image: your-registry/kosuke-agent:latest
        ports:
        - containerPort: 8000
        env:
        - name: DO_SPACES_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: kosuke-secrets
              key: spaces-access-key
        - name: DO_SPACES_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: kosuke-secrets
              key: spaces-secret-key
        - name: DB_HOST
          value: "postgres-service"
        volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
```

## Testing the Migration

### 1. Test File Operations

```bash
# Test the API endpoints
curl -X GET "http://localhost:8000/api/v1/health"

# Create a test project session
curl -X POST "http://localhost:8000/api/v1/projects/1/sessions/test-session/initialize"

# Write a test file
curl -X PUT "http://localhost:8000/api/v1/projects/1/sessions/test-session/files/test.txt" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, World!"}'

# Read the file back
curl -X GET "http://localhost:8000/api/v1/projects/1/sessions/test-session/files/test.txt"
```

### 2. Test Container Creation

```bash
# Test creating a container with the new service
curl -X POST "http://localhost:8000/api/preview/start" \
  -H "Content-Type: application/json" \
  -d '{"project_id": 1, "session_id": "test-session"}'
```

## Monitoring and Troubleshooting

### 1. Database Monitoring

```sql
-- Check project files table
SELECT project_id, session_id, COUNT(*) as file_count, SUM(size) as total_size
FROM project_files 
GROUP BY project_id, session_id;

-- Find large files in blob storage
SELECT project_id, session_id, file_path, size 
FROM project_files 
WHERE blob_key IS NOT NULL 
ORDER BY size DESC;
```

### 2. Blob Storage Monitoring

```bash
# Check Digital Ocean Spaces usage
doctl spaces buckets list-objects kosuke-projects --recursive
```

### 3. Common Issues

#### Issue: Container can't connect to API
```bash
# Solution: Check network connectivity
docker exec container-name curl http://host.docker.internal:8000/api/v1/health
```

#### Issue: Large files failing to upload
```bash
# Solution: Check Spaces configuration
# Ensure DO_SPACES_ACCESS_KEY and DO_SPACES_SECRET_KEY are correct
```

#### Issue: Database connection errors
```bash
# Solution: Verify database connectivity
python -c "import asyncpg; asyncio.run(asyncpg.connect('postgresql://user:pass@host/db'))"
```

## Performance Considerations

### 1. Database Connection Pooling
- Default pool size: 5-20 connections
- Adjust based on concurrent container count
- Monitor connection usage

### 2. Blob Storage Optimization
- Files < 1MB: Stored in database for speed
- Files ≥ 1MB: Stored in Spaces for cost efficiency
- Adjust threshold based on usage patterns

### 3. Caching Strategy
- Consider Redis for frequently accessed files
- Implement CDN for public assets
- Cache API responses for read-heavy workloads

## Rollback Plan

If you need to rollback to the filesystem approach:

1. Keep the old DockerService file as backup
2. Export data from database back to filesystem:

```python
async def rollback_to_filesystem():
    """Export database files back to filesystem"""
    projects_dir = Path("./projects")
    projects_dir.mkdir(exist_ok=True)
    
    # Query all files from database
    async with file_storage.db_pool.acquire() as conn:
        files = await conn.fetch("SELECT * FROM project_files")
        
        for file_row in files:
            project_path = projects_dir / str(file_row['project_id'])
            if file_row['session_id'] == 'main':
                file_path = project_path / file_row['file_path']
            else:
                file_path = project_path / "sessions" / file_row['session_id'] / file_row['file_path']
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Get content from database or blob storage
            if file_row['content']:
                file_path.write_text(file_row['content'])
            elif file_row['blob_key']:
                # Download from Spaces and write to file
                pass
```

3. Switch back to old DockerService
4. Remove database-related environment variables

## Conclusion

This migration eliminates the complexity and reliability issues of filesystem mounting while providing a scalable, production-ready solution for Digital Ocean. The API-based approach ensures consistency across environments and simplifies container management.

Key benefits achieved:
- ✅ No more filesystem mounting issues
- ✅ Scalable across multiple hosts
- ✅ Production-ready for Digital Ocean
- ✅ Simplified container lifecycle
- ✅ Reliable file storage with backups
- ✅ Clean separation of concerns