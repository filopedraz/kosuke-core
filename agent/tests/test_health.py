"""Tests for health endpoints"""

import pytest
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Test the basic health endpoint"""
    response = client.get("/health/simple")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "agentic-coding-pipeline"
    assert data["version"] == "1.0.0"


def test_health_detailed(client: TestClient):
    """Test the detailed health endpoint"""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "agentic-coding-pipeline"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data
    assert "configuration" in data
    assert "system" in data


def test_root_endpoint(client: TestClient):
    """Test the root endpoint"""
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "agentic-coding-pipeline"
    assert data["version"] == "1.0.0"
    assert "endpoints" in data
    assert "documentation" in data


@pytest.mark.asyncio()
async def test_health_endpoint_async():
    """Test health endpoint with async test"""
    from httpx import ASGITransport
    from httpx import AsyncClient

    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health/simple")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
