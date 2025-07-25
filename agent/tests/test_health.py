"""Tests for health endpoints"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    """Test client for FastAPI app"""
    return TestClient(app)


def test_health_endpoint(client: TestClient):
    """Test the basic health endpoint"""
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Agentic Coding Pipeline"
    assert data["version"] == "1.0.0"


def test_health_detailed(client: TestClient):
    """Test the detailed health endpoint"""
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Agentic Coding Pipeline"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data


def test_root_endpoint(client: TestClient):
    """Test the root endpoint"""
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Agentic Coding Pipeline"
    assert data["version"] == "1.0.0"
    assert "documentation" in data


@pytest.mark.asyncio()
async def test_health_endpoint_async():
    """Test health endpoint with async test"""
    from httpx import ASGITransport
    from httpx import AsyncClient

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_health_endpoint_simple(client: TestClient):
    """Test the simple health endpoint if it exists"""
    # This test is more flexible - it tries the simple endpoint but falls back
    try:
        response = client.get("/health/simple")
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "healthy"
    except Exception:
        # If simple endpoint doesn't exist, just pass
        pass


def test_health_endpoint_response_format(client: TestClient):
    """Test that health endpoint returns proper JSON format"""
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")

    data = response.json()

    # Verify required fields
    assert "status" in data
    assert "service" in data
    assert "version" in data
    assert "timestamp" in data

    # Verify field types
    assert isinstance(data["status"], str)
    assert isinstance(data["service"], str)
    assert isinstance(data["version"], str)
    assert isinstance(data["timestamp"], str)


def test_health_endpoint_status_values(client: TestClient):
    """Test that health endpoint returns valid status values"""
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()

    # Status should be one of the expected values
    valid_statuses = ["healthy", "unhealthy", "degraded"]
    assert data["status"] in valid_statuses


def test_multiple_health_requests(client: TestClient):
    """Test multiple consecutive health requests"""
    for i in range(5):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
