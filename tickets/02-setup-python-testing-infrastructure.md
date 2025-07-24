# 📋 Ticket 2: Setup Python Testing Infrastructure

**Priority:** High  
**Estimated Effort:** 2 hours

## Description

Set up comprehensive testing infrastructure for the Python agent microservice, including pytest configuration, code quality tools, and test structure similar to the morpheus project.

## Files to Create/Update

```
agent/pyproject.toml
agent/conftest.py
agent/tests/__init__.py
agent/tests/test_health.py
agent/.python-version
```

## Implementation Details

**agent/pyproject.toml** - Python project configuration:

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "kosuke-agent"
version = "1.0.0"
description = "AI coding agent microservice for Kosuke platform"
authors = [{name = "Kosuke Team"}]
requires-python = ">=3.11"
dependencies = [
    "fastapi==0.104.1",
    "uvicorn==0.24.0",
    "pydantic==2.5.0",
    "python-dotenv==1.0.0",
    "docker==7.0.0",
    "asyncpg==0.29.0",
    "PyGithub==2.1.1",
    "GitPython==3.1.40",
    "pytest==7.4.3",
    "pytest-asyncio==0.21.1",
    "pytest-cov==4.1.0",
    "mypy==1.7.1",
    "ruff==0.1.7",
    "bandit[toml]==1.7.5",
    "httpx==0.26.0",  # For testing FastAPI
]

# ==== pytest ====
[tool.pytest.ini_options]
minversion = "6.0"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "-v",
    "--tb=short",
    "--disable-warnings",
    "--color=yes",
    "--cov=app",
    "--cov-report=term-missing"
]
asyncio_mode = "auto"

# ==== Coverage ====
[tool.coverage.run]
source = ["app"]
omit = [
    "*/tests/*",
    "*/venv/*",
    "*/.venv/*",
    "*/__pycache__/*",
    "venv/*",
    ".venv/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if __name__ == .__main__.:",
    "raise AssertionError",
    "raise NotImplementedError",
]

# ==== mypy ====
[tool.mypy]
python_version = "3.11"
check_untyped_defs = true
ignore_missing_imports = true
warn_unused_ignores = true
warn_redundant_casts = true
warn_unused_configs = true
warn_return_any = true
warn_unreachable = true
strict_optional = true
disallow_untyped_calls = false
disallow_untyped_defs = true
disallow_incomplete_defs = true

# ==== ruff ====
[tool.ruff]
line-length = 100
target-version = "py311"
exclude = [
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    "build",
    "dist",
]

[tool.ruff.lint]
select = [
    "F",     # Pyflakes
    "E",     # pycodestyle errors
    "W",     # pycodestyle warnings
    "C90",   # mccabe
    "I",     # isort
    "N",     # pep8-naming
    "UP",    # pyupgrade
    "S",     # flake8-bandit
    "B",     # flake8-bugbear
    "C4",    # flake8-comprehensions
    "PIE",   # flake8-pie
    "PT",    # flake8-pytest-style
    "RET",   # flake8-return
    "SIM",   # flake8-simplify
    "PTH",   # flake8-use-pathlib
    "PL",    # Pylint
    "RUF",   # Ruff-specific rules
]
ignore = [
    "S101",   # Use of assert detected
    "PLR0913", # Too many arguments to function call
    "PLR2004", # Magic value used in comparison
]

[tool.ruff.lint.isort]
force-single-line = true
known-first-party = ["app"]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101", "PLR0913", "PLR2004", "ARG001"]
"conftest.py" = ["S101"]

# ==== bandit ====
[tool.bandit]
exclude_dirs = ["tests", "venv", ".venv"]
skips = ["B101", "B601"]
```

**agent/conftest.py** - Pytest configuration:

```python
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
        "CLERK_PUBLISHABLE_KEY": "pk_test_example",
        "CLERK_SECRET_KEY": "sk_test_example",
        "DATABASE_URL": "postgresql://test:test@localhost:5432/test_db",
        "NEXT_PUBLIC_APP_URL": "http://localhost:3000"
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
```

**agent/tests/**init**.py** - Test package marker:

```python
"""Test package for Kosuke agent microservice"""
```

**agent/tests/test_health.py** - Basic health endpoint test:

```python
"""Tests for health endpoints"""

import pytest
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Test the basic health endpoint"""
    response = client.get("/api/health/simple")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_health_detailed(client: TestClient):
    """Test the detailed health endpoint"""
    response = client.get("/api/health/detailed")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "system_info" in data
    assert "endpoints" in data


@pytest.mark.asyncio
async def test_health_endpoint_async():
    """Test health endpoint with async test"""
    from httpx import AsyncClient
    from app.main import app

    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/health/simple")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
```

**agent/.python-version** - Python version specification:

```
3.12
```

## Acceptance Criteria

- [x] pytest configuration with coverage reporting
- [x] Code quality tools configured (ruff, mypy, bandit)
- [x] Test structure established with fixtures
- [x] Basic health endpoint tests passing
- [x] Test commands working: `pytest`, `ruff check`, `mypy`
