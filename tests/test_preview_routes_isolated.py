"""Isolated tests for preview routes functionality"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Test the preview models
def test_preview_models():
    """Test that preview models can be created correctly"""
    from app.models.preview import StartPreviewRequest, StopPreviewRequest, PreviewStatus, ContainerInfo
    
    # Test StartPreviewRequest
    start_request = StartPreviewRequest(project_id=123, env_vars={"NODE_ENV": "development"})
    assert start_request.project_id == 123
    assert start_request.env_vars == {"NODE_ENV": "development"}
    
    # Test StopPreviewRequest  
    stop_request = StopPreviewRequest(project_id=123)
    assert stop_request.project_id == 123
    
    # Test PreviewStatus
    status = PreviewStatus(status="running", url="http://localhost:3000", port=3000)
    assert status.status == "running"
    assert status.url == "http://localhost:3000"
    assert status.port == 3000
    
    # Test ContainerInfo
    container_info = ContainerInfo(id="abc123", image="test:latest", status="running")
    assert container_info.id == "abc123"
    assert container_info.image == "test:latest"
    assert container_info.status == "running"


def test_preview_routes_creation():
    """Test that preview routes can be created and mounted"""
    from app.api.routes.preview import router
    
    # Verify router exists and has routes
    assert router is not None
    assert len(router.routes) > 0
    
    # Create a simple FastAPI app and include the router
    app = FastAPI()
    app.include_router(router, prefix="/api")
    
    # Verify the app includes our routes
    assert len([route for route in app.routes if hasattr(route, 'path')]) > 0


def test_docker_service_dependency():
    """Test that the Docker service dependency works"""
    from app.api.routes.preview import get_docker_service
    from app.services.docker_service import DockerService
    
    # Mock the DockerService to avoid Docker connection issues
    with pytest.MonkeyPatch().context() as m:
        mock_docker_service = MagicMock(spec=DockerService)
        mock_docker_service.is_docker_available = AsyncMock(return_value=True)
        
        # This would normally create a real DockerService, but we'll mock it
        result = get_docker_service()
        assert result is not None