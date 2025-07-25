"""Tests for preview API routes"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from app.models.preview import PreviewStatus, ContainerInfo


def test_preview_health_docker_available(client: TestClient):
    """Test preview health endpoint when Docker is available"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.is_docker_available = AsyncMock(return_value=True)
        mock_docker_service.return_value = mock_instance

        response = client.get("/api/preview/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["docker_available"] is True


def test_preview_health_docker_unavailable(client: TestClient):
    """Test preview health endpoint when Docker is unavailable"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.is_docker_available = AsyncMock(return_value=False)
        mock_docker_service.return_value = mock_instance

        response = client.get("/api/preview/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["docker_available"] is False


def test_start_preview_success(client: TestClient):
    """Test successful preview start"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.is_docker_available = AsyncMock(return_value=True)
        mock_instance.start_preview = AsyncMock(return_value="http://localhost:3001")
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/start", json={
            "project_id": 123,
            "env_vars": {"NODE_ENV": "development"}
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["url"] == "http://localhost:3001"
        assert data["project_id"] == 123


def test_start_preview_docker_unavailable(client: TestClient):
    """Test preview start when Docker is unavailable"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.is_docker_available = AsyncMock(return_value=False)
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/start", json={
            "project_id": 123,
            "env_vars": {}
        })

        assert response.status_code == 503
        assert "Docker is not available" in response.json()["detail"]


def test_start_preview_validation_error(client: TestClient):
    """Test preview start with invalid request data"""
    response = client.post("/api/preview/start", json={
        "project_id": "invalid",  # Should be integer
        "env_vars": {}
    })

    assert response.status_code == 422


def test_start_preview_service_error(client: TestClient):
    """Test preview start when service throws exception"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.is_docker_available = AsyncMock(return_value=True)
        mock_instance.start_preview = AsyncMock(side_effect=Exception("Container failed to start"))
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/start", json={
            "project_id": 123,
            "env_vars": {}
        })

        assert response.status_code == 500
        assert "Failed to start preview" in response.json()["detail"]


def test_stop_preview_success(client: TestClient):
    """Test successful preview stop"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.stop_preview = AsyncMock()
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/stop", json={
            "project_id": 123
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["project_id"] == 123


def test_stop_preview_validation_error(client: TestClient):
    """Test preview stop with invalid request data"""
    response = client.post("/api/preview/stop", json={
        "project_id": "invalid"  # Should be integer
    })

    assert response.status_code == 422


def test_stop_preview_service_error(client: TestClient):
    """Test preview stop when service throws exception"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.stop_preview = AsyncMock(side_effect=Exception("Failed to stop container"))
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/stop", json={
            "project_id": 123
        })

        assert response.status_code == 500
        assert "Failed to stop preview" in response.json()["detail"]


def test_get_preview_status_running(client: TestClient):
    """Test getting status for running preview"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.get_preview_status = AsyncMock(return_value=PreviewStatus(
            running=True,
            url="http://localhost:3001",
            compilation_complete=True,
            is_responding=True
        ))
        mock_docker_service.return_value = mock_instance

        response = client.get("/api/preview/status/123")

        assert response.status_code == 200
        data = response.json()
        assert data["running"] is True
        assert data["url"] == "http://localhost:3001"
        assert data["compilation_complete"] is True
        assert data["is_responding"] is True


def test_get_preview_status_not_running(client: TestClient):
    """Test getting status for non-running preview"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.get_preview_status = AsyncMock(return_value=PreviewStatus(
            running=False,
            url=None,
            compilation_complete=False,
            is_responding=False
        ))
        mock_docker_service.return_value = mock_instance

        response = client.get("/api/preview/status/999")

        assert response.status_code == 200
        data = response.json()
        assert data["running"] is False
        assert data["url"] is None


def test_get_preview_status_invalid_project_id(client: TestClient):
    """Test getting status with invalid project ID"""
    response = client.get("/api/preview/status/invalid")

    assert response.status_code == 422


def test_stop_all_previews_success(client: TestClient):
    """Test stopping all previews"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.stop_all_previews = AsyncMock()
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/stop-all")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "All previews stopped"


def test_stop_all_previews_service_error(client: TestClient):
    """Test stopping all previews when service fails"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.stop_all_previews = AsyncMock(side_effect=Exception("Failed to stop containers"))
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/stop-all")

        assert response.status_code == 500
        assert "Failed to stop all previews" in response.json()["detail"]


@pytest.mark.asyncio
async def test_preview_dependency_injection():
    """Test Docker service dependency injection"""
    from app.api.routes.preview import get_docker_service

    docker_service = await get_docker_service()

    assert docker_service is not None
    assert hasattr(docker_service, 'start_preview')
    assert hasattr(docker_service, 'stop_preview')
    assert hasattr(docker_service, 'get_preview_status')


def test_preview_routes_error_logging(client: TestClient, caplog):
    """Test that errors are properly logged"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.is_docker_available = AsyncMock(return_value=True)
        mock_instance.start_preview = AsyncMock(side_effect=Exception("Test error"))
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/start", json={
            "project_id": 123,
            "env_vars": {}
        })

        assert response.status_code == 500
        assert "Error starting preview for project 123" in caplog.text


def test_start_preview_with_empty_env_vars(client: TestClient):
    """Test preview start with empty env_vars"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.is_docker_available = AsyncMock(return_value=True)
        mock_instance.start_preview = AsyncMock(return_value="http://localhost:3002")
        mock_docker_service.return_value = mock_instance

        response = client.post("/api/preview/start", json={
            "project_id": 456
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["url"] == "http://localhost:3002"
        assert data["project_id"] == 456
        mock_instance.start_preview.assert_called_once_with(456, {})


def test_start_preview_with_complex_env_vars(client: TestClient):
    """Test preview start with complex environment variables"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.is_docker_available = AsyncMock(return_value=True)
        mock_instance.start_preview = AsyncMock(return_value="http://localhost:3003")
        mock_docker_service.return_value = mock_instance

        env_vars = {
            "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
            "API_KEY": "secret-key-123",
            "DEBUG": "true",
            "PORT": "3000"
        }

        response = client.post("/api/preview/start", json={
            "project_id": 789,
            "env_vars": env_vars
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["project_id"] == 789
        mock_instance.start_preview.assert_called_once_with(789, env_vars)


def test_get_preview_status_service_error(client: TestClient):
    """Test getting preview status when service throws exception"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.get_preview_status = AsyncMock(side_effect=Exception("Service error"))
        mock_docker_service.return_value = mock_instance

        response = client.get("/api/preview/status/123")

        assert response.status_code == 500
        assert "Failed to get preview status" in response.json()["detail"]


def test_preview_endpoints_require_correct_http_methods(client: TestClient):
    """Test that preview endpoints only accept correct HTTP methods"""
    # Test that GET is not allowed for start/stop endpoints
    response = client.get("/api/preview/start")
    assert response.status_code == 405

    response = client.get("/api/preview/stop")
    assert response.status_code == 405

    response = client.get("/api/preview/stop-all")
    assert response.status_code == 405

    # Test that POST is not allowed for status/health endpoints
    response = client.post("/api/preview/status/123")
    assert response.status_code == 405

    response = client.post("/api/preview/health")
    assert response.status_code == 405


def test_preview_status_partial_compilation(client: TestClient):
    """Test getting status for preview with partial compilation"""
    with patch('app.services.docker_service.DockerService') as mock_docker_service:
        mock_instance = MagicMock()
        mock_instance.get_preview_status = AsyncMock(return_value=PreviewStatus(
            running=True,
            url="http://localhost:3004",
            compilation_complete=False,
            is_responding=False
        ))
        mock_docker_service.return_value = mock_instance

        response = client.get("/api/preview/status/123")

        assert response.status_code == 200
        data = response.json()
        assert data["running"] is True
        assert data["url"] == "http://localhost:3004"
        assert data["compilation_complete"] is False
        assert data["is_responding"] is False