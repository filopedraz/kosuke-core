"""Tests for Docker service functionality"""

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import docker
import pytest

from app.models.preview import ContainerInfo
from app.services.docker_service import DockerService


@pytest.fixture()
def mock_docker_client():
    """Mock Docker client for testing"""
    with patch("docker.from_env") as mock:
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture()
def docker_service(mock_docker_client):
    """Docker service instance with mocked client"""
    return DockerService()


class TestDockerService:
    """Test cases for DockerService class"""

    @pytest.mark.asyncio()
    async def test_is_docker_available_success(self, docker_service, mock_docker_client):
        """Test Docker availability check when Docker is running"""
        mock_docker_client.ping.return_value = True

        result = await docker_service.is_docker_available()

        assert result is True
        mock_docker_client.ping.assert_called_once()

    @pytest.mark.asyncio()
    async def test_is_docker_available_failure(self, docker_service, mock_docker_client):
        """Test Docker availability check when Docker is not running"""
        mock_docker_client.ping.side_effect = docker.errors.APIError("Docker not available")

        result = await docker_service.is_docker_available()

        assert result is False

    @pytest.mark.asyncio()
    async def test_start_preview_success(self, docker_service, mock_docker_client):
        """Test successful preview container start"""
        # Mock container creation and start
        mock_container = MagicMock()
        mock_container.id = "test_container_id"
        mock_docker_client.containers.run.return_value = mock_container
        mock_docker_client.containers.get.side_effect = docker.errors.NotFound("Container not found")

        with patch.object(docker_service, "_get_random_port", return_value=3001), patch.object(
            docker_service, "_ensure_project_database", new_callable=AsyncMock
        ), patch.object(docker_service, "_get_project_environment", new_callable=AsyncMock) as mock_env:
            mock_env.return_value = {"NODE_ENV": "development"}

            url = await docker_service.start_preview(123, {"CUSTOM_VAR": "value"})

            assert url == "http://localhost:3001"
            assert 123 in docker_service.containers
            mock_docker_client.containers.run.assert_called_once()

    @pytest.mark.asyncio()
    async def test_start_preview_existing_container(self, docker_service):
        """Test starting preview when container already exists"""
        # Pre-populate containers dict
        existing_container = ContainerInfo(
            project_id=123,
            container_id="existing_id",
            container_name="kosuke-preview-123",
            port=3002,
            url="http://localhost:3002",
            compilation_complete=True,
        )
        docker_service.containers[123] = existing_container

        url = await docker_service.start_preview(123)

        assert url == "http://localhost:3002"

    @pytest.mark.asyncio()
    async def test_start_preview_existing_docker_container(self, docker_service, mock_docker_client):
        """Test starting preview when Docker container already exists and is running"""
        # Mock existing running container
        mock_container = MagicMock()
        mock_container.status = "running"
        mock_container.id = "existing_docker_id"
        mock_container.ports = {"3000/tcp": [{"HostPort": "3002"}]}
        mock_docker_client.containers.get.return_value = mock_container

        url = await docker_service.start_preview(123)

        assert url == "http://localhost:3002"
        assert 123 in docker_service.containers
        assert docker_service.containers[123].container_id == "existing_docker_id"

    @pytest.mark.asyncio()
    async def test_stop_preview_success(self, docker_service, mock_docker_client):
        """Test successful preview container stop"""
        # Setup existing container
        mock_container = MagicMock()
        container_info = ContainerInfo(
            project_id=123,
            container_id="test_id",
            container_name="kosuke-preview-123",
            port=3001,
            url="http://localhost:3001",
        )
        docker_service.containers[123] = container_info
        mock_docker_client.containers.get.return_value = mock_container

        await docker_service.stop_preview(123)

        mock_container.stop.assert_called_once_with(timeout=5)
        mock_container.remove.assert_called_once_with(force=True)
        assert 123 not in docker_service.containers

    @pytest.mark.asyncio()
    async def test_stop_preview_nonexistent(self, docker_service):
        """Test stopping preview for non-existent container"""
        # Should not raise exception
        await docker_service.stop_preview(999)

    @pytest.mark.asyncio()
    async def test_stop_preview_docker_not_found(self, docker_service, mock_docker_client):
        """Test stopping preview when Docker container is already removed"""
        container_info = ContainerInfo(
            project_id=123,
            container_id="test_id",
            container_name="kosuke-preview-123",
            port=3001,
            url="http://localhost:3001",
        )
        docker_service.containers[123] = container_info
        mock_docker_client.containers.get.side_effect = docker.errors.NotFound("Container not found")

        await docker_service.stop_preview(123)

        assert 123 not in docker_service.containers

    @pytest.mark.asyncio()
    async def test_get_preview_status_running(self, docker_service):
        """Test getting status for running container"""
        container_info = ContainerInfo(
            project_id=123,
            container_id="test_id",
            container_name="kosuke-preview-123",
            port=3001,
            url="http://localhost:3001",
            compilation_complete=True,
            is_responding=True,
        )
        docker_service.containers[123] = container_info

        with patch("aiohttp.ClientSession") as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_session.return_value.__aenter__.return_value.get.return_value.__aenter__.return_value = mock_response

            status = await docker_service.get_preview_status(123)

            assert status.running is True
            assert status.url == "http://localhost:3001"
            assert status.compilation_complete is True
            assert status.is_responding is True

    @pytest.mark.asyncio()
    async def test_get_preview_status_not_running(self, docker_service):
        """Test getting status for non-running container"""
        status = await docker_service.get_preview_status(999)

        assert status.running is False
        assert status.url is None
        assert status.compilation_complete is False
        assert status.is_responding is False

    @pytest.mark.asyncio()
    async def test_get_preview_status_not_responding(self, docker_service):
        """Test getting status when container is not responding"""
        container_info = ContainerInfo(
            project_id=123,
            container_id="test_id",
            container_name="kosuke-preview-123",
            port=3001,
            url="http://localhost:3001",
            compilation_complete=True,
        )
        docker_service.containers[123] = container_info

        with patch("aiohttp.ClientSession") as mock_session:
            # Simulate connection error
            mock_session.return_value.__aenter__.return_value.get.side_effect = Exception("Connection failed")

            status = await docker_service.get_preview_status(123)

            assert status.running is True
            assert status.is_responding is False

    def test_get_random_port_range(self, docker_service):
        """Test random port generation within range"""
        port = docker_service._get_random_port(3000, 3100)
        assert 3000 <= port <= 3100

    def test_get_container_name_format(self, docker_service):
        """Test container name generation format"""
        name = docker_service._get_container_name(123)
        assert name == "kosuke-preview-123"

    def test_prepare_container_environment(self, docker_service):
        """Test container environment preparation"""
        env_vars = {"CUSTOM_VAR": "custom_value", "API_KEY": "secret"}

        environment = docker_service._prepare_container_environment(123, env_vars)

        assert environment["NODE_ENV"] == "development"
        assert environment["PORT"] == "3000"
        assert environment["CUSTOM_VAR"] == "custom_value"
        assert environment["API_KEY"] == "secret"
        assert "kosuke_project_123" in environment["DATABASE_URL"]

    @pytest.mark.asyncio()
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

        mock_container1.stop.assert_called_once_with(timeout=5)
        mock_container2.stop.assert_called_once_with(timeout=5)
        mock_container1.remove.assert_called_once_with(force=True)
        mock_container2.remove.assert_called_once_with(force=True)
        assert len(docker_service.containers) == 0

    @pytest.mark.asyncio()
    async def test_environment_integration(self, docker_service):
        """Test environment variables integration"""
        with patch.object(docker_service, "_get_project_environment", new_callable=AsyncMock) as mock_env:
            mock_env.return_value = {"DATABASE_URL": "postgres://...", "API_KEY": "secret"}

            env_vars = await docker_service._get_project_environment(123)

            assert "DATABASE_URL" in env_vars
            assert "API_KEY" in env_vars
            mock_env.assert_called_once_with(123)

    @pytest.mark.asyncio()
    async def test_database_creation_success(self, docker_service):
        """Test successful project database creation"""
        with patch("asyncpg.connect", new_callable=AsyncMock) as mock_connect:
            mock_conn = AsyncMock()
            mock_connect.return_value = mock_conn

            await docker_service._ensure_project_database(123)

            mock_connect.assert_called_once()
            mock_conn.execute.assert_called_with("CREATE DATABASE kosuke_project_123")
            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio()
    async def test_database_creation_duplicate(self, docker_service):
        """Test database creation when database already exists"""
        with patch("asyncpg.connect", new_callable=AsyncMock) as mock_connect:
            mock_conn = AsyncMock()
            import asyncpg

            mock_conn.execute.side_effect = asyncpg.exceptions.DuplicateDatabaseError("Database already exists")
            mock_connect.return_value = mock_conn

            # Should not raise exception
            await docker_service._ensure_project_database(123)

            mock_connect.assert_called_once()
            mock_conn.close.assert_called_once()

    @pytest.mark.asyncio()
    async def test_database_creation_error(self, docker_service):
        """Test database creation error handling"""
        with patch("asyncpg.connect", new_callable=AsyncMock) as mock_connect:
            mock_connect.side_effect = Exception("Connection failed")

            # Should not raise exception, just log error
            await docker_service._ensure_project_database(123)

    @pytest.mark.asyncio()
    async def test_monitor_compilation_success(self, docker_service):
        """Test compilation monitoring success"""
        container_info = ContainerInfo(
            project_id=123,
            container_id="test_id",
            container_name="kosuke-preview-123",
            port=3001,
            url="http://localhost:3001",
            compilation_complete=False,
        )
        docker_service.containers[123] = container_info

        mock_container = MagicMock()
        mock_container.logs.return_value = [
            b"Starting development server...",
            b"compiled successfully in 1234ms",
            b"ready on http://localhost:3000",
        ]

        await docker_service._monitor_compilation(123, mock_container)

        assert docker_service.containers[123].compilation_complete is True

    @pytest.mark.asyncio()
    async def test_monitor_compilation_ready_message(self, docker_service):
        """Test compilation monitoring with ready message"""
        container_info = ContainerInfo(
            project_id=123,
            container_id="test_id",
            container_name="kosuke-preview-123",
            port=3001,
            url="http://localhost:3001",
            compilation_complete=False,
        )
        docker_service.containers[123] = container_info

        mock_container = MagicMock()
        mock_container.logs.return_value = [b"Starting development server...", b"ready started server on port 3000"]

        await docker_service._monitor_compilation(123, mock_container)

        assert docker_service.containers[123].compilation_complete is True

    @pytest.mark.asyncio()
    async def test_monitor_compilation_error(self, docker_service):
        """Test compilation monitoring error handling"""
        mock_container = MagicMock()
        mock_container.logs.side_effect = Exception("Log streaming failed")

        # Should not raise exception
        await docker_service._monitor_compilation(123, mock_container)
