# 📋 Ticket 22: Traefik Reverse Proxy Integration

**Priority:** Critical
**Estimated Effort:** 6 hours

## Description

Add Traefik as a reverse proxy to handle dynamic subdomain routing in production. Traefik will read container labels and route domains to the correct preview containers.

## Files to Create/Update

```
docker-compose.prod.yml
traefik/
├── traefik.yml
├── dynamic.yml
└── docker-compose.traefik.yml
agent/app/services/domain_service.py
agent/app/services/docker_service.py (update)
```

## Implementation Details

**docker-compose.prod.yml** - Production docker compose:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: kosuke_traefik
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
      - '8080:8080' # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
      - traefik_certs:/certs
    networks:
      - kosuke_network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.traefik.rule=Host(`traefik.kosuke.ai`)'
      - 'traefik.http.routers.traefik.tls.certresolver=letsencrypt'
      - 'traefik.http.services.traefik.loadbalancer.server.port=8080'
    environment:
      - CLOUDFLARE_EMAIL=${CLOUDFLARE_EMAIL}
      - CLOUDFLARE_API_KEY=${CLOUDFLARE_API_KEY}

  postgres:
    image: postgres:16.4-alpine
    container_name: kosuke_postgres
    env_file:
      - .env.prod
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - kosuke_network

  nextjs:
    build:
      context: .
      dockerfile: docker/nextjs/Dockerfile
    container_name: kosuke_nextjs
    env_file:
      - .env.prod
    environment:
      - AGENT_SERVICE_URL=http://agent:8000
    networks:
      - kosuke_network
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.main.rule=Host(`kosuke.ai`) || Host(`www.kosuke.ai`)'
      - 'traefik.http.routers.main.tls.certresolver=letsencrypt'
      - 'traefik.http.services.main.loadbalancer.server.port=3000'
    depends_on:
      - postgres
      - agent

  agent:
    build:
      context: ./agent
      dockerfile: Dockerfile
    container_name: kosuke_agent
    volumes:
      - ./agent:/app:cached
      - ./projects:/app/projects:cached
      - /var/run/docker.sock:/var/run/docker.sock # Allow agent to manage preview containers
    env_file:
      - ./agent/.env.prod
    environment:
      - PYTHONPATH=/app
      - PYTHONUNBUFFERED=1
      - NEXTJS_URL=http://nextjs:3000
      - TRAEFIK_ENABLED=true
    networks:
      - kosuke_network
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
  traefik_certs:

networks:
  kosuke_network:
    external: false
```

**traefik/traefik.yml** - Traefik configuration:

```yaml
global:
  checkNewVersion: false
  sendAnonymousUsage: false

api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ':80'
    http:
      redirections:
        entrypoint:
          to: websecure
          scheme: https
  websecure:
    address: ':443'

providers:
  docker:
    endpoint: 'unix:///var/run/docker.sock'
    exposedByDefault: false
    network: kosuke_network
  file:
    filename: /etc/traefik/dynamic.yml
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@kosuke.ai
      storage: /certs/acme.json
      dnsChallenge:
        provider: cloudflare
        delayBeforeCheck: 30
        resolvers:
          - '1.1.1.1:53'
          - '8.8.8.8:53'

log:
  level: INFO
  filePath: '/var/log/traefik.log'

accessLog:
  filePath: '/var/log/access.log'
```

**agent/app/services/domain_service.py** - Domain management service:

```python
import docker
import re
from datetime import datetime
from typing import Optional, Dict, List
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)

class DomainService:
    def __init__(self):
        self.docker_client = docker.from_env()

    def generate_subdomain(self, project_id: int, branch_name: str) -> str:
        """Generate subdomain based on project ID and branch name"""
        # Sanitize branch name for URL usage
        sanitized_branch = re.sub(r'[^a-zA-Z0-9-]', '-', branch_name.lower())
        sanitized_branch = re.sub(r'-+', '-', sanitized_branch)
        sanitized_branch = sanitized_branch.strip('-')

        # Limit length and ensure it's valid
        if len(sanitized_branch) > 20:
            sanitized_branch = sanitized_branch[:20].rstrip('-')

        # Create subdomain: project-{id}-{branch}
        subdomain = f"project-{project_id}-{sanitized_branch}"
        full_domain = f"{subdomain}.{settings.BASE_DOMAIN}"

        logger.info(f"Generated subdomain: {full_domain} for project {project_id}, branch: {branch_name}")
        return full_domain

    async def update_container_routing(self, project_id: int, container_name: str, port: int, branch_name: str) -> str:
        """Update container routing when container starts"""
        full_domain = self.generate_subdomain(project_id, branch_name)
        logger.info(f"Configuring routing for container {container_name} to domain {full_domain}")
        return full_domain

    async def get_domain_routing(self, domain: str) -> Optional[str]:
        """Get routing information for a domain"""
        # Note: In production, this would be handled by Traefik automatically
        # based on container labels. This method is kept for compatibility.
        logger.info(f"Domain routing for {domain} handled by Traefik")
        return domain
```

**agent/app/services/docker_service.py** - Update with domain integration:

```python
# Add import
from app.services.domain_service import DomainService

class DockerService:
    def __init__(self):
        self.client = docker.from_env()
        self.containers: Dict[int, ContainerInfo] = {}
        self.CONTAINER_NAME_PREFIX = "kosuke-preview-"
        self.environment_service = EnvironmentService()
        self.domain_service = DomainService()

    async def start_preview(self, project_id: int, branch_name: str, env_vars: Dict[str, str] = None) -> str:
        """Start preview container for project with automatic subdomain routing"""
        if env_vars is None:
            env_vars = {}

        container_name = self._get_container_name(project_id)

        # ... existing container creation logic ...

        # Generate automatic subdomain based on project ID and branch name
        project_domain = self.domain_service.generate_subdomain(project_id, branch_name)

        # Add Traefik labels for automatic routing
        labels = {
            "traefik.enable": "true",
            f"traefik.http.routers.{container_name}.rule": f"Host(`{project_domain}`)",
            f"traefik.http.routers.{container_name}.tls.certresolver": "letsencrypt",
            f"traefik.http.services.{container_name}.loadbalancer.server.port": "3000",
            "traefik.docker.network": "kosuke_network"
        }

        container = self.client.containers.run(
            image=settings.PREVIEW_DEFAULT_IMAGE,
            name=container_name,
            command=["sh", "-c", "cd /app && npm run dev -- -H 0.0.0.0"],
            ports={},  # No port mapping in production - Traefik handles routing
            volumes={project_path: {'bind': '/app', 'mode': 'rw'}},
            working_dir='/app',
            environment=environment,
            networks=['kosuke_network'],
            labels=labels,
            detach=True,
            auto_remove=False
        )

        # Confirm domain routing setup
        await self.domain_service.update_container_routing(project_id, container_name, 3000, branch_name)
        url = f"https://{project_domain}"

        # ... rest of existing logic ...

        return url
```

## Acceptance Criteria

- [x] Traefik reverse proxy configured
- [x] Dynamic subdomain routing
- [x] SSL certificate automation with Let's Encrypt
- [x] Container labeling for routing
- [x] Domain routing cache for performance
