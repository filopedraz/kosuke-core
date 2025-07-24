# 📋 Ticket 5: Add Preview API Routes to Agent

**Priority:** Critical  
**Estimated Effort:** 3 hours

## Description

Create FastAPI endpoints in the Python agent for preview management, replacing the Next.js preview logic.

## Files to Create/Update

```
agent/app/api/routes/preview.py
agent/app/main.py (update to include preview router)
```

## Implementation Details

**agent/app/api/routes/preview.py** - Preview API routes:

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

        url = await docker_service.start_preview(request.project_id, request.env_vars)
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
from app.api.routes import preview

# Add this line after existing routers
app.include_router(preview.router, prefix="/api", tags=["preview"])
```

## Test Cases

**agent/tests/test_preview_routes.py** - Preview API routes test cases:

```python
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
```

## Acceptance Criteria

- [x] Preview routes created in Python agent
- [x] Start/stop/status operations available via API
- [x] Error handling and logging implemented
- [x] Health check endpoint for preview service
- [ ] Comprehensive test coverage for all preview endpoints
- [ ] Request validation tests for all routes
- [ ] Error handling tests for service failures
- [ ] Docker availability tests
- [ ] Integration tests with Docker service
- [ ] Performance tests for concurrent preview operations
