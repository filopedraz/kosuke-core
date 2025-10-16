"""
pytest configuration file for the agent module.
Provides fixtures and test setup for the Kosuke agent.
"""

import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Import fixtures to make them available
from tests.fixtures import create_sample_project_structure

# Set required environment variables before importing any modules
os.environ.setdefault("ANTHROPIC_API_KEY", "test-api-key")
os.environ.setdefault("LOG_LEVEL", "INFO")
os.environ.setdefault("PROJECTS_DIR", str(Path(tempfile.gettempdir()) / "test-projects"))
os.environ.setdefault("NEXTJS_URL", "http://localhost:3000")
os.environ.setdefault("WEBHOOK_SECRET", "test-secret")

# Add the agent directory to Python path
agent_dir = Path(__file__).parent
sys.path.insert(0, str(agent_dir))


def get_test_client():
    """Get FastAPI test client with proper imports"""
    # Import app here to ensure environment variables are set first
    from app.main import app  # noqa: PLC0415

    return TestClient(app)


@pytest.fixture
def client():
    """FastAPI test client"""
    return get_test_client()


@pytest.fixture
def mock_project_id():
    """Standard project ID for testing"""
    return 123


@pytest.fixture
def mock_env_vars():
    """Sample environment variables for testing"""
    return {"CLERK_SECRET_KEY": "sk_test_example", "DATABASE_URL": "postgresql://test:test@localhost:5432/test_db"}


@pytest.fixture
def sample_files_structure():
    """Sample project files structure for testing"""
    return {
        "package.json": '{"name": "test-project", "version": "1.0.0"}',
        "src/index.js": "console.log('Hello World');",
        "src/components/Button.tsx": "export const Button = () => <button>Click me</button>;",
        "README.md": "# Test Project\n\nThis is a test project.",
    }


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory with sample files"""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / "test_project"
        project_path.mkdir()

        # Create project structure
        structure = create_sample_project_structure()

        for file_path, content in structure.items():
            full_path = project_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)

            if content:  # Only write non-empty content
                full_path.write_text(content)
            else:
                full_path.touch()  # Create empty file

        yield project_path
