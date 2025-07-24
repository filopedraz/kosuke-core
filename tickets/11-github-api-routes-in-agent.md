# 📋 Ticket 11: GitHub API Routes in Agent

**Priority:** High  
**Estimated Effort:** 3 hours

## Description

Create FastAPI routes in the Python agent for GitHub operations, including repo creation, import, and commit management.

## Files to Create/Update

```
agent/app/api/routes/github.py
agent/app/main.py (update to include GitHub router)
```

## Implementation Details

**agent/app/api/routes/github.py** - GitHub API routes:

```python
from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List
from app.services.github_service import GitHubService
from app.models.github import (
    CreateRepoRequest, ImportRepoRequest, GitHubRepo,
    GitHubCommit, CommitChangesRequest
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_github_service(github_token: str) -> GitHubService:
    """Create GitHub service with token"""
    return GitHubService(github_token)

@router.post("/github/create-repo")
async def create_repository(
    request: CreateRepoRequest,
    github_token: str = Header(..., alias="X-GitHub-Token")
) -> GitHubRepo:
    """Create a new GitHub repository"""
    try:
        github_service = get_github_service(github_token)
        repo = await github_service.create_repository(request)
        return repo
    except Exception as e:
        logger.error(f"Error creating repository: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github/import-repo")
async def import_repository(
    request: ImportRepoRequest,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """Import a GitHub repository to a project"""
    try:
        github_service = get_github_service(github_token)
        project_path = await github_service.import_repository(request)
        return {
            "success": True,
            "project_id": request.project_id,
            "project_path": project_path
        }
    except Exception as e:
        logger.error(f"Error importing repository: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github/start-session")
async def start_sync_session(
    project_id: int,
    session_id: str,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """Start a new sync session for tracking changes"""
    try:
        github_service = get_github_service(github_token)
        github_service.start_sync_session(project_id, session_id)
        return {
            "success": True,
            "session_id": session_id,
            "project_id": project_id
        }
    except Exception as e:
        logger.error(f"Error starting sync session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github/track-change")
async def track_file_change(
    session_id: str,
    file_path: str,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """Track a file change in the current sync session"""
    try:
        github_service = get_github_service(github_token)
        github_service.track_file_change(session_id, file_path)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking file change: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/github/commit-session")
async def commit_session_changes(
    session_id: str,
    commit_message: Optional[str] = None,
    github_token: str = Header(..., alias="X-GitHub-Token")
):
    """Commit all changes from a sync session"""
    try:
        github_service = get_github_service(github_token)
        commit = await github_service.commit_session_changes(session_id, commit_message)

        # End the session
        summary = github_service.end_sync_session(session_id)

        return {
            "success": True,
            "commit": commit.dict() if commit else None,
            "session_summary": summary
        }
    except Exception as e:
        logger.error(f"Error committing session changes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/github/repo-info")
async def get_repository_info(
    repo_url: str,
    github_token: str = Header(..., alias="X-GitHub-Token")
) -> GitHubRepo:
    """Get information about a GitHub repository"""
    try:
        github_service = get_github_service(github_token)
        repo_info = await github_service.get_repository_info(repo_url)
        return repo_info
    except Exception as e:
        logger.error(f"Error getting repository info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/github/user-repos")
async def get_user_repositories(
    page: int = 1,
    per_page: int = 30,
    github_token: str = Header(..., alias="X-GitHub-Token")
) -> List[GitHubRepo]:
    """Get user's GitHub repositories"""
    try:
        github_service = get_github_service(github_token)
        repos = github_service.get_user_repositories(page, per_page)
        return repos
    except Exception as e:
        logger.error(f"Error getting user repositories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/github/health")
async def github_health():
    """GitHub service health check"""
    return {"status": "healthy", "service": "github"}
```

**agent/app/main.py** - Update to include GitHub router:

```python
# Add this import
from app.api.routes import github

# Add this line after existing routers
app.include_router(github.router, prefix="/api", tags=["github"])
```

## Test Cases

**agent/tests/test_github_service.py** - GitHub service test cases:

```python
"""Tests for GitHub service functionality"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from app.services.github_service import GitHubService
from app.models.github import GitHubRepo, GitHubCommit, CreateRepoRequest, ImportRepoRequest


@pytest.fixture
def mock_github_client():
    """Mock GitHub client for testing"""
    with patch('github.Github') as mock:
        mock_instance = MagicMock()
        mock_user = MagicMock()
        mock_user.login = "testuser"
        mock_instance.get_user.return_value = mock_user
        mock.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def github_service(mock_github_client):
    """GitHub service instance with mocked client"""
    return GitHubService("test_token")


@pytest.fixture
def temp_project_dir():
    """Create temporary project directory for testing"""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / "test_project"
        project_path.mkdir()
        yield project_path


class TestGitHubService:
    """Test cases for GitHubService class"""

    @pytest.mark.asyncio
    async def test_create_repository_success(self, github_service, mock_github_client):
        """Test successful repository creation"""
        # Mock repository creation
        mock_repo = MagicMock()
        mock_repo.name = "test-repo"
        mock_repo.owner.login = "testuser"
        mock_repo.clone_url = "https://github.com/testuser/test-repo.git"
        mock_repo.private = True
        mock_repo.description = "Test repository"

        mock_github_client.get_user.return_value.create_repo.return_value = mock_repo

        request = CreateRepoRequest(
            name="test-repo",
            description="Test repository",
            private=True
        )

        result = await github_service.create_repository(request)

        assert result.name == "test-repo"
        assert result.owner == "testuser"
        assert result.url == "https://github.com/testuser/test-repo.git"
        assert result.private is True
        assert result.description == "Test repository"

    @pytest.mark.asyncio
    async def test_create_repository_from_template(self, github_service, mock_github_client):
        """Test repository creation from template"""
        # Mock template repository
        mock_template = MagicMock()
        mock_github_client.get_repo.return_value = mock_template

        # Mock repository creation from template
        mock_repo = MagicMock()
        mock_repo.name = "new-repo"
        mock_repo.owner.login = "testuser"
        mock_repo.clone_url = "https://github.com/testuser/new-repo.git"
        mock_repo.private = True
        mock_repo.description = "From template"

        mock_github_client.get_user.return_value.create_repo_from_template.return_value = mock_repo

        request = CreateRepoRequest(
            name="new-repo",
            description="From template",
            private=True,
            template_repo="template-owner/template-repo"
        )

        result = await github_service.create_repository(request)

        assert result.name == "new-repo"
        mock_github_client.get_repo.assert_called_once_with("template-owner/template-repo")

    @pytest.mark.asyncio
    async def test_create_repository_error(self, github_service, mock_github_client):
        """Test repository creation error handling"""
        mock_github_client.get_user.return_value.create_repo.side_effect = Exception("API Error")

        request = CreateRepoRequest(name="test-repo")

        with pytest.raises(Exception) as exc_info:
            await github_service.create_repository(request)

        assert "Failed to create repository" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_import_repository_success(self, github_service, temp_project_dir):
        """Test successful repository import"""
        with patch('git.Repo.clone_from') as mock_clone:
            mock_repo = MagicMock()
            mock_clone.return_value = mock_repo

            with patch('app.utils.config.settings.PROJECTS_DIR', str(temp_project_dir.parent)):
                request = ImportRepoRequest(
                    repo_url="https://github.com/user/repo.git",
                    project_id=123
                )

                result = await github_service.import_repository(request)

                assert result.endswith("123")
                mock_clone.assert_called_once()

    @pytest.mark.asyncio
    async def test_import_repository_existing_directory(self, github_service, temp_project_dir):
        """Test importing repository when project directory already exists"""
        existing_file = temp_project_dir / "existing.txt"
        existing_file.write_text("existing content")

        with patch('git.Repo.clone_from') as mock_clone:
            with patch('app.utils.config.settings.PROJECTS_DIR', str(temp_project_dir.parent)):
                request = ImportRepoRequest(
                    repo_url="https://github.com/user/repo.git",
                    project_id=123
                )

                result = await github_service.import_repository(request)

                # Should remove existing directory and clone fresh
                assert not existing_file.exists()
                mock_clone.assert_called_once()

    def test_start_sync_session(self, github_service):
        """Test starting a sync session"""
        github_service.start_sync_session(123, "session_123")

        assert "session_123" in github_service.sync_sessions
        session = github_service.sync_sessions["session_123"]
        assert session["project_id"] == 123
        assert session["status"] == "active"
        assert isinstance(session["start_time"], datetime)

    def test_track_file_change(self, github_service):
        """Test tracking file changes in session"""
        # Start session first
        github_service.start_sync_session(123, "session_123")

        # Track file changes
        github_service.track_file_change("session_123", "src/component.tsx")
        github_service.track_file_change("session_123", "package.json")

        session = github_service.sync_sessions["session_123"]
        assert "src/component.tsx" in session["files_changed"]
        assert "package.json" in session["files_changed"]
        assert len(session["files_changed"]) == 2

    def test_track_file_change_duplicate(self, github_service):
        """Test tracking duplicate file changes"""
        github_service.start_sync_session(123, "session_123")

        # Track same file multiple times
        github_service.track_file_change("session_123", "src/component.tsx")
        github_service.track_file_change("session_123", "src/component.tsx")

        session = github_service.sync_sessions["session_123"]
        assert len(session["files_changed"]) == 1

    def test_track_file_change_invalid_session(self, github_service):
        """Test tracking file change for invalid session"""
        # Should not raise exception
        github_service.track_file_change("invalid_session", "file.txt")

    @pytest.mark.asyncio
    async def test_commit_changes_success(self, github_service, temp_project_dir):
        """Test successful commit creation"""
        # Setup session with files
        github_service.start_sync_session(123, "session_123")
        github_service.track_file_change("session_123", "src/component.tsx")

        with patch('git.Repo') as mock_repo_class:
            mock_repo = MagicMock()
            mock_commit = MagicMock()
            mock_commit.hexsha = "abc123"
            mock_commit.message = "AI: Updated component"
            mock_commit.html_url = "https://github.com/user/repo/commit/abc123"
            mock_repo.commit.return_value = mock_commit
            mock_repo_class.return_value = mock_repo

            with patch('app.utils.config.settings.PROJECTS_DIR', str(temp_project_dir.parent)):
                commit = await github_service.commit_changes(123, "session_123", "Updated component")

                assert commit.sha == "abc123"
                assert commit.message == "AI: Updated component"
                assert commit.files_changed == 1
                mock_repo.git.add.assert_called_once_with(".")
                mock_repo.index.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_commit_changes_no_changes(self, github_service, temp_project_dir):
        """Test commit when no files have changed"""
        github_service.start_sync_session(123, "session_123")

        with patch('git.Repo') as mock_repo_class:
            mock_repo = MagicMock()
            mock_repo.git.diff.return_value = ""  # No changes
            mock_repo_class.return_value = mock_repo

            with patch('app.utils.config.settings.PROJECTS_DIR', str(temp_project_dir.parent)):
                commit = await github_service.commit_changes(123, "session_123")

                assert commit is None
                mock_repo.index.commit.assert_not_called()

    def test_end_sync_session(self, github_service):
        """Test ending a sync session"""
        # Start session and track changes
        github_service.start_sync_session(123, "session_123")
        github_service.track_file_change("session_123", "file1.txt")
        github_service.track_file_change("session_123", "file2.txt")

        summary = github_service.end_sync_session("session_123")

        assert summary["session_id"] == "session_123"
        assert summary["project_id"] == 123
        assert summary["files_changed_count"] == 2
        assert summary["status"] == "completed"
        assert "session_123" not in github_service.sync_sessions

    def test_end_sync_session_invalid(self, github_service):
        """Test ending invalid session"""
        summary = github_service.end_sync_session("invalid_session")

        assert summary["session_id"] == "invalid_session"
        assert summary["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_get_repository_info(self, github_service, mock_github_client):
        """Test getting repository information"""
        mock_repo = MagicMock()
        mock_repo.name = "test-repo"
        mock_repo.owner.login = "testuser"
        mock_repo.private = False
        mock_repo.description = "Test repository"
        mock_github_client.get_repo.return_value = mock_repo

        info = await github_service.get_repository_info("testuser/test-repo")

        assert info["name"] == "test-repo"
        assert info["owner"] == "testuser"
        assert info["private"] is False

    @pytest.mark.asyncio
    async def test_get_repository_info_not_found(self, github_service, mock_github_client):
        """Test getting info for non-existent repository"""
        from github import UnknownObjectException
        mock_github_client.get_repo.side_effect = UnknownObjectException(404, {}, {})

        with pytest.raises(Exception) as exc_info:
            await github_service.get_repository_info("user/nonexistent")

        assert "Repository not found" in str(exc_info.value)
```

**agent/tests/test_github_routes.py** - GitHub API routes test cases:

```python
"""Tests for GitHub API routes"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from app.models.github import GitHubRepo, GitHubCommit


def test_create_repository_success(client: TestClient):
    """Test successful repository creation"""
    with patch('app.services.github_service.GitHubService') as mock_service_class:
        mock_service = MagicMock()
        mock_service.create_repository = AsyncMock(return_value=GitHubRepo(
            name="test-repo",
            owner="testuser",
            url="https://github.com/testuser/test-repo.git",
            private=True,
            description="Test repository"
        ))
        mock_service_class.return_value = mock_service

        response = client.post("/api/github/create-repo",
            headers={"X-GitHub-Token": "test_token"},
            json={
                "name": "test-repo",
                "description": "Test repository",
                "private": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "test-repo"
        assert data["owner"] == "testuser"

def test_create_repository_missing_token(client: TestClient):
    """Test repository creation without GitHub token"""
    response = client.post("/api/github/create-repo", json={
        "name": "test-repo"
    })

    assert response.status_code == 422

def test_import_repository_success(client: TestClient):
    """Test successful repository import"""
    with patch('app.services.github_service.GitHubService') as mock_service_class:
        mock_service = MagicMock()
        mock_service.import_repository = AsyncMock(return_value="/projects/123")
        mock_service_class.return_value = mock_service

        response = client.post("/api/github/import-repo",
            headers={"X-GitHub-Token": "test_token"},
            json={
                "repo_url": "https://github.com/user/repo.git",
                "project_id": 123
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["project_id"] == 123

def test_start_sync_session(client: TestClient):
    """Test starting a sync session"""
    with patch('app.services.github_service.GitHubService') as mock_service_class:
        mock_service = MagicMock()
        mock_service.start_sync_session = MagicMock()
        mock_service_class.return_value = mock_service

        response = client.post("/api/github/start-session",
            headers={"X-GitHub-Token": "test_token"},
            params={"project_id": 123, "session_id": "session_123"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

def test_track_file_change(client: TestClient):
    """Test tracking file changes"""
    with patch('app.services.github_service.GitHubService') as mock_service_class:
        mock_service = MagicMock()
        mock_service.track_file_change = MagicMock()
        mock_service_class.return_value = mock_service

        response = client.post("/api/github/track-change",
            headers={"X-GitHub-Token": "test_token"},
            params={"session_id": "session_123", "file_path": "src/component.tsx"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

def test_commit_changes_success(client: TestClient):
    """Test successful commit creation"""
    with patch('app.services.github_service.GitHubService') as mock_service_class:
        mock_service = MagicMock()
        mock_service.commit_changes = AsyncMock(return_value=GitHubCommit(
            sha="abc123",
            message="AI: Updated component",
            url="https://github.com/user/repo/commit/abc123",
            files_changed=2,
            timestamp="2024-01-01T00:00:00Z"
        ))
        mock_service_class.return_value = mock_service

        response = client.post("/api/github/commit-changes",
            headers={"X-GitHub-Token": "test_token"},
            json={
                "project_id": 123,
                "session_id": "session_123",
                "message": "Updated component"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["sha"] == "abc123"
        assert data["files_changed"] == 2
```

## Acceptance Criteria

- [x] GitHub routes created in Python agent
- [x] Repository operations available via API
- [x] Sync session management routes
- [x] Token-based authentication for GitHub operations
- [ ] Comprehensive test coverage for GitHub service methods
- [ ] Mock tests for GitHub API interactions
- [ ] Repository creation and import tests
- [ ] Sync session and file tracking tests
- [ ] Commit functionality tests
- [ ] Error handling tests for GitHub API failures
- [ ] Integration tests with Git operations
