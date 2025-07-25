"""Tests for preview API routes"""

from unittest.mock import AsyncMock
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.models.preview import PreviewStatus


@patch("app.services.docker_service.docker.from_env")
def test_preview_health_docker_available(mock_docker_from_env, client: TestClient):
    """Test preview health endpoint when Docker is available"""
    mock_client = MagicMock()
    mock_client.ping.return_value = True
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.is_docker_available", new_callable=AsyncMock
    ) as mock_is_available:
        mock_is_available.return_value = True

        response = client.get("/api/preview/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["docker_available"] is True


@patch("app.services.docker_service.docker.from_env")
def test_preview_health_docker_unavailable(mock_docker_from_env, client: TestClient):
    """Test preview health endpoint when Docker is unavailable"""
    mock_client = MagicMock()
    mock_client.ping.side_effect = Exception("Docker not available")
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.is_docker_available", new_callable=AsyncMock
    ) as mock_is_available:
        mock_is_available.return_value = False

        response = client.get("/api/preview/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["docker_available"] is False


@patch("app.services.docker_service.docker.from_env")
def test_start_preview_success(mock_docker_from_env, client: TestClient):
    """Test successful preview start"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.is_docker_available", new_callable=AsyncMock
    ) as mock_is_available, patch(
        "app.services.docker_service.DockerService.start_preview", new_callable=AsyncMock
    ) as mock_start_preview:
        mock_is_available.return_value = True
        mock_start_preview.return_value = "http://localhost:3001"

        response = client.post("/api/preview/start", json={"project_id": 123, "env_vars": {"NODE_ENV": "development"}})

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["url"] == "http://localhost:3001"
        assert data["project_id"] == 123


@patch("app.services.docker_service.docker.from_env")
def test_start_preview_docker_unavailable(mock_docker_from_env, client: TestClient):
    """Test preview start when Docker is unavailable"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.is_docker_available", new_callable=AsyncMock
    ) as mock_is_available:
        mock_is_available.return_value = False

        response = client.post("/api/preview/start", json={"project_id": 123, "env_vars": {}})

        assert response.status_code == 503
        assert "Docker is not available" in response.json()["detail"]


@patch("app.services.docker_service.docker.from_env")
def test_start_preview_validation_error(mock_docker_from_env, client: TestClient):
    """Test preview start with invalid request data"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    response = client.post(
        "/api/preview/start",
        json={
            "project_id": "invalid",  # Should be integer
            "env_vars": {},
        },
    )

    assert response.status_code == 422


@patch("app.services.docker_service.docker.from_env")
def test_start_preview_service_error(mock_docker_from_env, client: TestClient):
    """Test preview start when service throws exception"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.is_docker_available", new_callable=AsyncMock
    ) as mock_is_available, patch(
        "app.services.docker_service.DockerService.start_preview", new_callable=AsyncMock
    ) as mock_start_preview:
        mock_is_available.return_value = True
        mock_start_preview.side_effect = Exception("Container failed to start")

        response = client.post("/api/preview/start", json={"project_id": 123, "env_vars": {}})

        assert response.status_code == 500
        assert "Failed to start preview" in response.json()["detail"]


@patch("app.services.docker_service.docker.from_env")
def test_stop_preview_success(mock_docker_from_env, client: TestClient):
    """Test successful preview stop"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch("app.services.docker_service.DockerService.stop_preview", new_callable=AsyncMock) as mock_stop_preview:
        mock_stop_preview.return_value = None

        response = client.post("/api/preview/stop", json={"project_id": 123})

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["project_id"] == 123


@patch("app.services.docker_service.docker.from_env")
def test_stop_preview_validation_error(mock_docker_from_env, client: TestClient):
    """Test preview stop with invalid request data"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    response = client.post(
        "/api/preview/stop",
        json={
            "project_id": "invalid"  # Should be integer
        },
    )

    assert response.status_code == 422


@patch("app.services.docker_service.docker.from_env")
def test_stop_preview_service_error(mock_docker_from_env, client: TestClient):
    """Test preview stop when service throws exception"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch("app.services.docker_service.DockerService.stop_preview", new_callable=AsyncMock) as mock_stop_preview:
        mock_stop_preview.side_effect = Exception("Failed to stop container")

        response = client.post("/api/preview/stop", json={"project_id": 123})

        assert response.status_code == 500
        assert "Failed to stop preview" in response.json()["detail"]


@patch("app.services.docker_service.docker.from_env")
def test_get_preview_status_running(mock_docker_from_env, client: TestClient):
    """Test getting status for running preview"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.get_preview_status", new_callable=AsyncMock
    ) as mock_get_status:
        mock_get_status.return_value = PreviewStatus(
            running=True, url="http://localhost:3001", compilation_complete=True, is_responding=True
        )

        response = client.get("/api/preview/status/123")

        assert response.status_code == 200
        data = response.json()
        assert data["running"] is True
        assert data["url"] == "http://localhost:3001"
        assert data["compilation_complete"] is True
        assert data["is_responding"] is True


@patch("app.services.docker_service.docker.from_env")
def test_get_preview_status_not_running(mock_docker_from_env, client: TestClient):
    """Test getting status for non-running preview"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.get_preview_status", new_callable=AsyncMock
    ) as mock_get_status:
        mock_get_status.return_value = PreviewStatus(
            running=False, url=None, compilation_complete=False, is_responding=False
        )

        response = client.get("/api/preview/status/999")

        assert response.status_code == 200
        data = response.json()
        assert data["running"] is False
        assert data["url"] is None


@patch("app.services.docker_service.docker.from_env")
def test_get_preview_status_invalid_project_id(mock_docker_from_env, client: TestClient):
    """Test getting status with invalid project ID"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    response = client.get("/api/preview/status/invalid")

    assert response.status_code == 422


@patch("app.services.docker_service.docker.from_env")
def test_stop_all_previews_success(mock_docker_from_env, client: TestClient):
    """Test stopping all previews"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch("app.services.docker_service.DockerService.stop_all_previews", new_callable=AsyncMock) as mock_stop_all:
        mock_stop_all.return_value = None

        response = client.post("/api/preview/stop-all")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "All previews stopped"


@patch("app.services.docker_service.docker.from_env")
def test_stop_all_previews_service_error(mock_docker_from_env, client: TestClient):
    """Test stopping all previews when service fails"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch("app.services.docker_service.DockerService.stop_all_previews", new_callable=AsyncMock) as mock_stop_all:
        mock_stop_all.side_effect = Exception("Failed to stop containers")

        response = client.post("/api/preview/stop-all")

        assert response.status_code == 500
        assert "Failed to stop all previews" in response.json()["detail"]


@pytest.mark.asyncio()
@patch("app.services.docker_service.docker.from_env")
async def test_preview_dependency_injection(mock_docker_from_env):
    """Test Docker service dependency injection"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    from app.api.routes.preview import get_docker_service

    docker_service = await get_docker_service()

    assert docker_service is not None
    assert hasattr(docker_service, "start_preview")
    assert hasattr(docker_service, "stop_preview")
    assert hasattr(docker_service, "get_preview_status")


@patch("app.services.docker_service.docker.from_env")
def test_preview_routes_error_logging(mock_docker_from_env, client: TestClient, caplog):
    """Test that errors are properly logged"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.is_docker_available", new_callable=AsyncMock
    ) as mock_is_available, patch(
        "app.services.docker_service.DockerService.start_preview", new_callable=AsyncMock
    ) as mock_start_preview:
        mock_is_available.return_value = True
        mock_start_preview.side_effect = Exception("Test error")

        response = client.post("/api/preview/start", json={"project_id": 123, "env_vars": {}})

        assert response.status_code == 500
        assert "Error starting preview for project 123" in caplog.text


@patch("app.services.docker_service.docker.from_env")
def test_start_preview_with_empty_env_vars(mock_docker_from_env, client: TestClient):
    """Test preview start with empty env_vars"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.is_docker_available", new_callable=AsyncMock
    ) as mock_is_available, patch(
        "app.services.docker_service.DockerService.start_preview", new_callable=AsyncMock
    ) as mock_start_preview:
        mock_is_available.return_value = True
        mock_start_preview.return_value = "http://localhost:3002"

        response = client.post("/api/preview/start", json={"project_id": 456})

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["url"] == "http://localhost:3002"
        assert data["project_id"] == 456
        mock_start_preview.assert_called_once_with(456, {})


@patch("app.services.docker_service.docker.from_env")
def test_start_preview_with_complex_env_vars(mock_docker_from_env, client: TestClient):
    """Test preview start with complex environment variables"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.is_docker_available", new_callable=AsyncMock
    ) as mock_is_available, patch(
        "app.services.docker_service.DockerService.start_preview", new_callable=AsyncMock
    ) as mock_start_preview:
        mock_is_available.return_value = True
        mock_start_preview.return_value = "http://localhost:3003"

        env_vars = {
            "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",
            "API_KEY": "secret-key-123",
            "DEBUG": "true",
            "PORT": "3000",
        }

        response = client.post("/api/preview/start", json={"project_id": 789, "env_vars": env_vars})

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["project_id"] == 789
        mock_start_preview.assert_called_once_with(789, env_vars)


@patch("app.services.docker_service.docker.from_env")
def test_get_preview_status_service_error(mock_docker_from_env, client: TestClient):
    """Test getting preview status when service throws exception"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.get_preview_status", new_callable=AsyncMock
    ) as mock_get_status:
        mock_get_status.side_effect = Exception("Service error")

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


@patch("app.services.docker_service.docker.from_env")
def test_preview_status_partial_compilation(mock_docker_from_env, client: TestClient):
    """Test getting status for preview with partial compilation"""
    mock_client = MagicMock()
    mock_docker_from_env.return_value = mock_client

    with patch(
        "app.services.docker_service.DockerService.get_preview_status", new_callable=AsyncMock
    ) as mock_get_status:
        mock_get_status.return_value = PreviewStatus(
            running=True, url="http://localhost:3004", compilation_complete=False, is_responding=False
        )

        response = client.get("/api/preview/status/123")

        assert response.status_code == 200
        data = response.json()
        assert data["running"] is True
        assert data["url"] == "http://localhost:3004"
        assert data["compilation_complete"] is False
        assert data["is_responding"] is False
