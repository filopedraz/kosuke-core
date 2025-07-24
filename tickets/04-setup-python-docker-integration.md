# 📋 Ticket 4: Setup Python Docker Integration

**Priority:** Critical  
**Estimated Effort:** 4 hours

## Description

Add Docker SDK and container management capabilities to the Python agent service. This will prepare the foundation for migrating the preview logic.

## Files to Create/Update

```
agent/app/services/docker_service.py
agent/requirements.txt (add docker dependency)
agent/app/models/preview.py
```

## Implementation Details

**agent/requirements.txt** - Add Docker dependency:

```txt
# Add to existing requirements
docker==7.0.0
asyncpg==0.29.0
```

**agent/app/utils/config.py** - Add preview image setting:

```python
# Add to config
PREVIEW_DEFAULT_IMAGE = os.getenv("PREVIEW_DEFAULT_IMAGE", "ghcr.io/filopedraz/kosuke-template:v0.0.73")
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
    env_vars: Dict[str, str] = {}

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

    async def _get_project_environment(self, project_id: int) -> Dict[str, str]:
        """Get project-specific environment variables from database"""
        return await self.environment_service.get_project_environment(project_id)

    async def _ensure_project_database(self, project_id: int) -> None:
        """Ensure project has its own database in postgres"""
        try:
            import asyncpg

            # Connect to postgres as admin
            conn = await asyncpg.connect(
                host="postgres",
                port=5432,
                user="postgres",
                password="postgres",
                database="postgres"
            )

            # Create project database if it doesn't exist
            db_name = f"kosuke_project_{project_id}"
            await conn.execute(f"CREATE DATABASE {db_name}")

            await conn.close()
            logger.info(f"Created database for project {project_id}")

        except asyncpg.DuplicateDatabaseError:
            # Database already exists, that's fine
            pass
        except Exception as e:
            logger.error(f"Error creating database for project {project_id}: {e}")
            # Don't fail the container start if database creation fails

    async def start_preview(self, project_id: int, env_vars: Dict[str, str] = None) -> str:
        """Start preview container for project"""
        if env_vars is None:
            env_vars = {}
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

        # Ensure project has its own database
        await self._ensure_project_database(project_id)

        # Create new container
        host_port = self._get_random_port()
        project_path = f"{settings.PROJECTS_DIR}/{project_id}"

        # Prepare container environment
        environment = self.environment_service.prepare_container_environment(project_id, env_vars)

        container = self.client.containers.run(
            image=settings.PREVIEW_DEFAULT_IMAGE,  # Use the kosuke-template image
            name=container_name,
            command=["sh", "-c", "cd /app && npm run dev -- -H 0.0.0.0"],
            ports={'3000/tcp': host_port},
            volumes={project_path: {'bind': '/app', 'mode': 'rw'}},
            working_dir='/app',
            environment=environment,
            network='kosuke_default',  # Connect to kosuke network for postgres access
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

## Test Cases

**agent/tests/test_docker_service.py** - Docker service test cases:

```python
"""Tests for Docker service functionality"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import docker
from app.services.docker_service import DockerService
from app.models.preview import ContainerInfo, PreviewStatus, StartPreviewRequest


@pytest.fixture
def mock_docker_client():
    """Mock Docker client for testing"""
    with patch('docker.from_env') as mock:
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def docker_service(mock_docker_client):
    """Docker service instance with mocked client"""
    return DockerService()


class TestDockerService:
    """Test cases for DockerService class"""

    @pytest.mark.asyncio
    async def test_is_docker_available_success(self, docker_service, mock_docker_client):
        """Test Docker availability check when Docker is running"""
        mock_docker_client.ping.return_value = True

        result = await docker_service.is_docker_available()

        assert result is True
        mock_docker_client.ping.assert_called_once()

    @pytest.mark.asyncio
    async def test_is_docker_available_failure(self, docker_service, mock_docker_client):
        """Test Docker availability check when Docker is not running"""
        mock_docker_client.ping.side_effect = docker.errors.APIError("Docker not available")

        result = await docker_service.is_docker_available()

        assert result is False

    @pytest.mark.asyncio
    async def test_start_preview_success(self, docker_service, mock_docker_client):
        """Test successful preview container start"""
        # Mock container creation and start
        mock_container = MagicMock()
        mock_container.id = "test_container_id"
        mock_docker_client.containers.run.return_value = mock_container

        with patch.object(docker_service, '_get_random_port', return_value=3001):
            with patch.object(docker_service, '_ensure_project_database', new_callable=AsyncMock):
                with patch.object(docker_service, '_get_project_environment', new_callable=AsyncMock) as mock_env:
                    mock_env.return_value = {"NODE_ENV": "development"}

                    url = await docker_service.start_preview(123, {"CUSTOM_VAR": "value"})

                    assert url == "http://localhost:3001"
                    assert 123 in docker_service.containers
                    mock_docker_client.containers.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_start_preview_existing_container(self, docker_service):
        """Test starting preview when container already exists"""
        # Pre-populate containers dict
        existing_container = ContainerInfo(
            project_id=123,
            container_id="existing_id",
            container_name="kosuke-preview-123",
            port=3002,
            url="http://localhost:3002",
            compilation_complete=True
        )
        docker_service.containers[123] = existing_container

        url = await docker_service.start_preview(123)

        assert url == "http://localhost:3002"

    @pytest.mark.asyncio
    async def test_stop_preview_success(self, docker_service, mock_docker_client):
        """Test successful preview container stop"""
        # Setup existing container
        mock_container = MagicMock()
        container_info = ContainerInfo(
            project_id=123,
            container_id="test_id",
            container_name="kosuke-preview-123",
            port=3001,
            url="http://localhost:3001"
        )
        docker_service.containers[123] = container_info
        mock_docker_client.containers.get.return_value = mock_container

        await docker_service.stop_preview(123)

        mock_container.stop.assert_called_once()
        mock_container.remove.assert_called_once()
        assert 123 not in docker_service.containers

    @pytest.mark.asyncio
    async def test_stop_preview_nonexistent(self, docker_service):
        """Test stopping preview for non-existent container"""
        # Should not raise exception
        await docker_service.stop_preview(999)

    @pytest.mark.asyncio
    async def test_get_preview_status_running(self, docker_service):
        """Test getting status for running container"""
        container_info = ContainerInfo(
            project_id=123,
            container_id="test_id",
            container_name="kosuke-preview-123",
            port=3001,
            url="http://localhost:3001",
            compilation_complete=True,
            is_responding=True
        )
        docker_service.containers[123] = container_info

        status = await docker_service.get_preview_status(123)

        assert status.running is True
        assert status.url == "http://localhost:3001"
        assert status.compilation_complete is True

    @pytest.mark.asyncio
    async def test_get_preview_status_not_running(self, docker_service):
        """Test getting status for non-running container"""
        status = await docker_service.get_preview_status(999)

        assert status.running is False
        assert status.url is None

    def test_get_random_port_range(self, docker_service):
        """Test random port generation within range"""
        port = docker_service._get_random_port(3000, 3100)
        assert 3000 <= port <= 3100

    def test_get_container_name_format(self, docker_service):
        """Test container name generation format"""
        name = docker_service._get_container_name(123)
        assert name == "kosuke-preview-123"

    @pytest.mark.asyncio
    async def test_stop_all_previews(self, docker_service, mock_docker_client):
        """Test stopping all preview containers"""
        # Setup multiple containers
        mock_container1 = MagicMock()
        mock_container2 = MagicMock()
        docker_service.containers[123] = ContainerInfo(
            project_id=123, container_id="id1", container_name="name1", port=3001, url="url1"
        )
        docker_service.containers[456] = ContainerInfo(
            project_id=456, container_id="id2", container_name="name2", port=3002, url="url2"
        )

        mock_docker_client.containers.get.side_effect = [mock_container1, mock_container2]

        await docker_service.stop_all_previews()

        mock_container1.stop.assert_called_once()
        mock_container2.stop.assert_called_once()
        assert len(docker_service.containers) == 0

    @pytest.mark.asyncio
    async def test_environment_integration(self, docker_service):
        """Test environment variables integration"""
        with patch.object(docker_service, '_get_project_environment', new_callable=AsyncMock) as mock_env:
            mock_env.return_value = {"DATABASE_URL": "postgres://...", "API_KEY": "secret"}

            env_vars = await docker_service._get_project_environment(123)

            assert "DATABASE_URL" in env_vars
            assert "API_KEY" in env_vars
            mock_env.assert_called_once_with(123)

    @pytest.mark.asyncio
    async def test_database_creation(self, docker_service):
        """Test project database creation"""
        with patch('asyncpg.connect', new_callable=AsyncMock) as mock_connect:
            mock_conn = AsyncMock()
            mock_connect.return_value = mock_conn

            await docker_service._ensure_project_database(123)

            mock_connect.assert_called_once()
            mock_conn.execute.assert_called()
            mock_conn.close.assert_called_once()
```

## Acceptance Criteria

- [x] Docker SDK integrated into Python agent
- [x] Container management service created
- [x] Preview data models defined
- [x] Basic start/stop/status operations implemented
- [ ] Comprehensive test coverage for all Docker service methods
- [ ] Mock tests for Docker client interactions
- [ ] Error handling tests for Docker unavailability
- [ ] Integration tests for container lifecycle management
- [ ] Performance tests for concurrent container operations
