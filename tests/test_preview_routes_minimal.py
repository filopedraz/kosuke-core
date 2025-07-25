"""Minimal tests for preview routes only"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Import only what we need to avoid dependency issues
from app.models.preview import PreviewStatus, StartPreviewRequest, StopPreviewRequest


def test_preview_models():
    """Test that preview models can be created correctly"""
    # Test StartPreviewRequest
    start_request = StartPreviewRequest(project_id=123, env_vars={"NODE_ENV": "development"})
    assert start_request.project_id == 123
    assert start_request.env_vars == {"NODE_ENV": "development"}
    
    # Test StopPreviewRequest  
    stop_request = StopPreviewRequest(project_id=123)
    assert stop_request.project_id == 123
    
    # Test PreviewStatus
    status = PreviewStatus(
        running=True,
        url="http://localhost:3001",
        compilation_complete=True,
        is_responding=True
    )
    assert status.running is True
    assert status.url == "http://localhost:3001"
    assert status.compilation_complete is True
    assert status.is_responding is True


def test_preview_routes_basic_structure():
    """Test the basic structure of preview routes"""
    from app.api.routes.preview import router
    
    # Check that the router exists and has the expected routes
    assert router is not None
    
    # Get the routes from the router
    routes = [route.path for route in router.routes]
    
    # Check that our expected routes exist
    expected_routes = [
        "/preview/start",
        "/preview/stop", 
        "/preview/status/{project_id}",
        "/preview/stop-all",
        "/preview/health"
    ]
    
    for expected_route in expected_routes:
        assert expected_route in routes


@pytest.mark.asyncio
async def test_docker_service_dependency():
    """Test that the docker service dependency function works"""
    from app.api.routes.preview import get_docker_service
    
    docker_service = await get_docker_service()
    
    assert docker_service is not None
    assert hasattr(docker_service, 'start_preview')
    assert hasattr(docker_service, 'stop_preview')
    assert hasattr(docker_service, 'get_preview_status')
    assert hasattr(docker_service, 'stop_all_previews')


def test_preview_routes_with_mock_dependencies():
    """Test preview routes with mocked dependencies"""
    
    # Create a minimal FastAPI app just for testing
    app = FastAPI()
    
    # Import and include the preview router  
    from app.api.routes.preview import router
    app.include_router(router, prefix="/api")
    
    # Mock the docker service dependency
    from app.api.routes import preview
    
    async def mock_docker_service():
        mock = MagicMock()
        mock.is_docker_available = AsyncMock(return_value=True)
        mock.start_preview = AsyncMock(return_value="http://localhost:3001")
        mock.stop_preview = AsyncMock()
        mock.get_preview_status = AsyncMock(return_value=PreviewStatus(
            running=True,
            url="http://localhost:3001", 
            compilation_complete=True,
            is_responding=True
        ))
        mock.stop_all_previews = AsyncMock()
        return mock
    
    # Override the dependency
    app.dependency_overrides[preview.get_docker_service] = mock_docker_service
    
    with TestClient(app) as client:
        # Test health endpoint
        response = client.get("/api/preview/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["docker_available"] is True
        
        # Test start preview
        response = client.post("/api/preview/start", json={
            "project_id": 123,
            "env_vars": {"NODE_ENV": "development"}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["url"] == "http://localhost:3001"
        assert data["project_id"] == 123
        
        # Test stop preview  
        response = client.post("/api/preview/stop", json={
            "project_id": 123
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["project_id"] == 123
        
        # Test get status
        response = client.get("/api/preview/status/123")
        assert response.status_code == 200
        data = response.json()
        assert data["running"] is True
        assert data["url"] == "http://localhost:3001"
        
        # Test stop all
        response = client.post("/api/preview/stop-all")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


def test_preview_routes_validation():
    """Test request validation for preview routes"""
    
    # Create a minimal FastAPI app just for testing
    app = FastAPI()
    
    # Import and include the preview router  
    from app.api.routes.preview import router
    app.include_router(router, prefix="/api")
    
    # Mock the docker service dependency
    from app.api.routes import preview
    
    async def mock_docker_service():
        mock = MagicMock()
        mock.is_docker_available = AsyncMock(return_value=True)
        return mock
    
    # Override the dependency
    app.dependency_overrides[preview.get_docker_service] = mock_docker_service
    
    with TestClient(app) as client:
        # Test invalid project_id in start preview
        response = client.post("/api/preview/start", json={
            "project_id": "invalid",  # Should be integer
            "env_vars": {}
        })
        assert response.status_code == 422
        
        # Test invalid project_id in stop preview
        response = client.post("/api/preview/stop", json={
            "project_id": "invalid"  # Should be integer
        })
        assert response.status_code == 422
        
        # Test invalid project_id in status endpoint
        response = client.get("/api/preview/status/invalid")
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__])