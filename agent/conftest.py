"""
pytest configuration file for the agent module.
Provides fixtures and test setup for the Kosuke agent.
"""

import sys
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add the agent directory to Python path
agent_dir = Path(__file__).parent
sys.path.insert(0, str(agent_dir))

# Import after path setup
from app.main import app


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def mock_project_id():
    """Standard project ID for testing"""
    return 123


@pytest.fixture
def mock_env_vars():
    """Sample environment variables for testing"""
    return {
        "CLERK_SECRET_KEY": "sk_test_example",
        "DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"
    }


@pytest.fixture
def sample_files_structure():
    """Sample project files structure for testing"""
    return {
        "package.json": '{"name": "test-project", "version": "1.0.0"}',
        "src/index.js": "console.log('Hello World');",
        "src/components/Button.tsx": "export const Button = () => <button>Click me</button>;",
        "README.md": "# Test Project\n\nThis is a test project."
    } 