# 📋 Ticket 20: Integrate Environment Variables with Preview System

**Priority:** High  
**Estimated Effort:** 3 hours

## Description

Complete the integration by implementing the `_get_project_environment` method in the Docker service and updating the Python agent to fetch project environment variables from the database.

## Files to Update

```
agent/app/services/docker_service.py
agent/app/services/environment_service.py (new)
agent/app/models/environment.py (new)
```

## Implementation Details

**agent/app/models/environment.py** - Environment data models:

```python
from pydantic import BaseModel
from typing import Optional, Dict

class EnvironmentVariable(BaseModel):
    id: int
    key: str
    value: str
    is_secret: bool
    description: Optional[str] = None

class ProjectEnvironment(BaseModel):
    project_id: int
    variables: Dict[str, str]  # key-value pairs for container
```

**agent/app/services/environment_service.py** - Environment management service:

```python
from typing import Dict, List
from app.models.environment import EnvironmentVariable, ProjectEnvironment
import logging

logger = logging.getLogger(__name__)

class EnvironmentService:
    def __init__(self):
        # No database connection - environment variables are passed from Next.js
        pass

    def prepare_container_environment(self, project_id: int, env_vars: Dict[str, str]) -> Dict[str, str]:
        """Prepare environment variables for container deployment"""
        # Base environment variables
        environment = {
            'PROJECT_ID': str(project_id),
            'NODE_ENV': 'development',
            'NEXT_TELEMETRY_DISABLED': '1',
            'POSTGRES_URL': f"postgresql://postgres:postgres@postgres:5432/kosuke_project_{project_id}",
        }

        # Add user-configured environment variables
        environment.update(env_vars)

        return environment
```

**agent/app/services/docker_service.py** - Update to use environment service:

```python
# Add import
from app.services.environment_service import EnvironmentService

class DockerService:
    def __init__(self):
        self.client = docker.from_env()
        self.containers: Dict[int, ContainerInfo] = {}
        self.CONTAINER_NAME_PREFIX = "kosuke-preview-"
        self.environment_service = EnvironmentService()
```

**Note:** The agent no longer needs direct database connection settings since environment variables are passed from Next.js.

## Test Cases

**agent/tests/test_environment_service.py** - Environment service test cases:

```python
"""Tests for Environment service functionality"""

import pytest
from unittest.mock import patch, MagicMock
from app.services.environment_service import EnvironmentService


@pytest.fixture
def environment_service():
    """Environment service instance for testing"""
    return EnvironmentService()


class TestEnvironmentService:
    """Test cases for EnvironmentService class"""

    def test_prepare_container_environment_base(self, environment_service):
        """Test preparing base container environment"""
        result = environment_service.prepare_container_environment(123, {})

        assert result['PROJECT_ID'] == '123'
        assert result['NODE_ENV'] == 'development'
        assert result['NEXT_TELEMETRY_DISABLED'] == '1'
        assert result['POSTGRES_URL'] == 'postgresql://postgres:postgres@postgres:5432/kosuke_project_123'

    def test_prepare_container_environment_with_custom_vars(self, environment_service):
        """Test preparing environment with custom variables"""
        custom_vars = {
            'API_KEY': 'secret_key',
            'DEBUG': 'true',
            'CUSTOM_VAR': 'custom_value'
        }

        result = environment_service.prepare_container_environment(123, custom_vars)

        # Base variables should be present
        assert result['PROJECT_ID'] == '123'
        assert result['NODE_ENV'] == 'development'

        # Custom variables should be added
        assert result['API_KEY'] == 'secret_key'
        assert result['DEBUG'] == 'true'
        assert result['CUSTOM_VAR'] == 'custom_value'

    def test_prepare_container_environment_override_base(self, environment_service):
        """Test that custom variables can override base variables"""
        custom_vars = {
            'NODE_ENV': 'production',
            'PROJECT_ID': '999'  # Should override the base setting
        }

        result = environment_service.prepare_container_environment(123, custom_vars)

        # Custom values should override base values
        assert result['NODE_ENV'] == 'production'
        assert result['PROJECT_ID'] == '999'  # Overridden by custom var

        # Other base vars should remain
        assert result['NEXT_TELEMETRY_DISABLED'] == '1'

    def test_prepare_container_environment_different_project_ids(self, environment_service):
        """Test environment preparation for different project IDs"""
        result_123 = environment_service.prepare_container_environment(123, {})
        result_456 = environment_service.prepare_container_environment(456, {})

        assert result_123['PROJECT_ID'] == '123'
        assert result_456['PROJECT_ID'] == '456'

        assert result_123['POSTGRES_URL'] == 'postgresql://postgres:postgres@postgres:5432/kosuke_project_123'
        assert result_456['POSTGRES_URL'] == 'postgresql://postgres:postgres@postgres:5432/kosuke_project_456'

    def test_prepare_container_environment_empty_custom_vars(self, environment_service):
        """Test environment preparation with empty custom variables"""
        result = environment_service.prepare_container_environment(123, {})

        # Should contain only base variables
        expected_keys = ['PROJECT_ID', 'NODE_ENV', 'NEXT_TELEMETRY_DISABLED', 'POSTGRES_URL']
        assert all(key in result for key in expected_keys)
        assert len(result) == len(expected_keys)

    def test_prepare_container_environment_special_characters(self, environment_service):
        """Test environment variables with special characters"""
        custom_vars = {
            'DATABASE_URL': 'postgresql://user:pass@host:5432/db?sslmode=require',
            'SECRET_KEY': 'key_with_!@#$%^&*()_+-={}[]|\\:";\'<>?,./',
            'JSON_CONFIG': '{"key": "value", "number": 123}'
        }

        result = environment_service.prepare_container_environment(123, custom_vars)

        assert result['DATABASE_URL'] == custom_vars['DATABASE_URL']
        assert result['SECRET_KEY'] == custom_vars['SECRET_KEY']
        assert result['JSON_CONFIG'] == custom_vars['JSON_CONFIG']

    def test_prepare_container_environment_none_values(self, environment_service):
        """Test environment variables with None values"""
        custom_vars = {
            'OPTIONAL_VAR': None,
            'REQUIRED_VAR': 'value'
        }

        # Should handle None values gracefully (convert to string or filter out)
        result = environment_service.prepare_container_environment(123, custom_vars)

        # None values should either be converted to string or filtered out
        if 'OPTIONAL_VAR' in result:
            assert result['OPTIONAL_VAR'] == 'None' or result['OPTIONAL_VAR'] == ''
        assert result['REQUIRED_VAR'] == 'value'

    def test_prepare_container_environment_large_number_of_vars(self, environment_service):
        """Test environment preparation with many variables"""
        custom_vars = {f'VAR_{i}': f'value_{i}' for i in range(100)}

        result = environment_service.prepare_container_environment(123, custom_vars)

        # Should handle large number of variables
        assert len(result) >= 100  # 100 custom + base vars
        assert all(f'VAR_{i}' in result for i in range(100))

    def test_prepare_container_environment_immutable_input(self, environment_service):
        """Test that input dictionary is not modified"""
        custom_vars = {'TEST_VAR': 'original_value'}
        original_vars = custom_vars.copy()

        result = environment_service.prepare_container_environment(123, custom_vars)

        # Original input should not be modified
        assert custom_vars == original_vars
        assert result['TEST_VAR'] == 'original_value'

    def test_environment_service_initialization(self):
        """Test environment service initialization"""
        service = EnvironmentService()

        # Should initialize without requiring database connection
        assert service is not None
        assert hasattr(service, 'prepare_container_environment')

    def test_prepare_container_environment_type_safety(self, environment_service):
        """Test type safety for project_id parameter"""
        # Should handle integer project_id
        result = environment_service.prepare_container_environment(123, {})
        assert result['PROJECT_ID'] == '123'

        # Should handle string project_id (convert to string anyway)
        result = environment_service.prepare_container_environment("456", {})
        assert result['PROJECT_ID'] == "456"
```

## Acceptance Criteria

- [x] Environment service implemented (no database connection)
- [x] Docker service integrated with environment variables
- [x] Project environment variables loaded into preview containers
- [x] Next.js fetches env vars and passes to agent
- [x] Agent isolated from main database
- [ ] Comprehensive test coverage for environment variable preparation
- [ ] Tests for base environment variable setup
- [ ] Tests for custom variable integration and overrides
- [ ] Tests for special characters and edge cases in variables
- [ ] Tests for different project ID scenarios
- [ ] Performance tests for large numbers of environment variables

---

## 🎯 Final Updated Summary

This comprehensive plan now covers:

**Phase 1: Infrastructure & Preview Migration (Tickets 1-7)**

- Rename agent endpoints folder to routes (consistency)
- Set up Python testing infrastructure (pytest, ruff, mypy)
- Set up pre-commit hooks for code quality
- Move Docker container management from Next.js to Python agent
- Create clean API proxy layer in Next.js
- Remove old preview logic

**Phase 2: GitHub Integration (Tickets 8-13)**

- OAuth integration with Clerk
- Repository creation and import
- Auto-commit with session-based checkpoints
- Complete webhook integration

**Phase 3: Enhanced UI & Modern Auth (Tickets 14-15)**

- Branch management and pull request creation UI
- Complete Clerk authentication migration

**Phase 4: Advanced Features (Tickets 16-20)**

- Checkpoint/revert system for session management
- Database management with schema viewer and query runner
- Environment variables management system

**Phase 5: Production Subdomain Routing (Tickets 21-23)**

- Custom domain database schema
- Traefik reverse proxy integration
- Domain management UI

**Total Estimated Effort:** ~62.5 hours

**Final Architecture Benefits:**
✅ **Ultra-lean Next.js** - pure frontend + auth + API proxy  
✅ **Modern Clerk authentication** - industry standard  
✅ **Complete testing infrastructure** - pytest, ruff, mypy, bandit with pre-commit hooks  
✅ **Complete GitHub workflow** - like Vercel's integration  
✅ **Visual branch management** - see status, create PRs instantly  
✅ **Checkpoint system** - revert to any previous state  
✅ **Database management** - full schema and data visibility  
✅ **Environment variables management** - per-project configuration  
✅ **Correct Docker image** - using kosuke-template:v0.0.73  
✅ **Isolated project databases** - each project gets its own postgres DB  
✅ **Centralized Python agent** - all operations in one service  
✅ **Auto-commit with checkpoints** - intelligent batch commits  
✅ **Clean separation** - frontend, auth, and agent logic isolated

## 🔧 Key Updates Made:

1. **Code Organization:**
   - Renamed `agent/app/api/endpoints/` to `agent/app/api/routes/` for better naming consistency

2. **Testing & Quality Infrastructure:**
   - Comprehensive pytest setup with coverage reporting
   - Python code quality tools: ruff, mypy, bandit
   - Multi-language pre-commit hooks for Python and TypeScript
   - Development scripts and Makefile for easy commands

3. **Preview System Enhanced:**
   - Uses correct Docker image: `ghcr.io/filopedraz/kosuke-template:v0.0.73`
   - Each project gets its own postgres database: `kosuke_project_{id}`
   - Preview containers connect to kosuke network for database access
   - Environment variables injected into preview containers

4. **Environment Variables System:**
   - New Settings tab in project detail view
   - Secure storage with secret variable support
   - Integration with preview containers
   - Support for Clerk, Polar, and custom variables

5. **Database Strategy:**
   - Each project gets isolated database in shared postgres instance
   - Preview containers connect via `POSTGRES_URL` environment variable
   - Python agent manages database creation automatically

Ready to implement! 🚀

## 🤔 Questions for You:

1. **Environment Variable Templates**: Should we provide predefined templates for common integrations (Clerk, Polar) to help users get started quickly?

2. **Secret Encryption**: For secret variables, should we implement encryption at rest, or is database access control sufficient for now?

3. **Integration Testing**: Do you want integration tests for the preview system with the new database connections and environment variables?

---

## Phase 5: Production Subdomain Routing
