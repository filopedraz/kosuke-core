# 📋 Ticket 10: GitHub Service in Python Agent

**Priority:** Critical
**Estimated Effort:** 6 hours

## Description

Create GitHub integration service in the Python agent for repository operations, including creating repos, cloning, and managing commits.

## Files to Create/Update

```
agent/app/services/github_service.py
agent/app/models/github.py
agent/requirements.txt (add GitHub dependencies)
agent/app/main.py (update to include GitHub router)
```

## Implementation Details

**agent/requirements.txt** - Add GitHub dependencies:

```txt
# Add to existing requirements
PyGithub==2.1.1
GitPython==3.1.40
```

**agent/app/models/github.py** - GitHub data models:

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class GitHubRepo(BaseModel):
    name: str
    owner: str
    url: str
    private: bool = True
    description: Optional[str] = None

class GitHubCommit(BaseModel):
    sha: str
    message: str
    url: str
    files_changed: int
    timestamp: datetime

class CreateRepoRequest(BaseModel):
    name: str
    description: Optional[str] = None
    private: bool = True
    template_repo: Optional[str] = None

class ImportRepoRequest(BaseModel):
    repo_url: str
    project_id: int

class CommitChangesRequest(BaseModel):
    project_id: int
    session_id: str
    message: Optional[str] = None
    files: List[str] = []

class SyncSessionInfo(BaseModel):
    session_id: str
    project_id: int
    files_changed: List[str] = []
    start_time: datetime
    status: str = "active"
```

**agent/app/services/github_service.py** - GitHub operations service:

```python
import os
import git
import tempfile
import shutil
from github import Github
from typing import Optional, List, Dict
from datetime import datetime
from app.models.github import GitHubRepo, GitHubCommit, CreateRepoRequest, ImportRepoRequest
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self, github_token: str):
        self.github = Github(github_token)
        self.user = self.github.get_user()
        self.sync_sessions: Dict[str, Dict] = {}

    async def create_repository(self, request: CreateRepoRequest) -> GitHubRepo:
        """Create a new GitHub repository"""
        try:
            # Check if template repo should be used
            if request.template_repo:
                # Use template repository
                template = self.github.get_repo(request.template_repo)
                repo = self.user.create_repo_from_template(
                    template,
                    request.name,
                    description=request.description,
                    private=request.private
                )
            else:
                # Create empty repository
                repo = self.user.create_repo(
                    request.name,
                    description=request.description,
                    private=request.private,
                    auto_init=True,
                    gitignore_template="Node"
                )

            return GitHubRepo(
                name=repo.name,
                owner=repo.owner.login,
                url=repo.clone_url,
                private=repo.private,
                description=repo.description
            )
        except Exception as e:
            logger.error(f"Error creating repository: {e}")
            raise Exception(f"Failed to create repository: {str(e)}")

    async def import_repository(self, request: ImportRepoRequest) -> str:
        """Import/clone a GitHub repository to local project"""
        try:
            project_path = f"{settings.projects_dir}/{request.project_id}"

            # Remove existing project directory if it exists
            if os.path.exists(project_path):
                shutil.rmtree(project_path)

            # Clone repository
            repo = git.Repo.clone_from(request.repo_url, project_path)

            logger.info(f"Successfully imported repository to project {request.project_id}")
            return project_path
        except Exception as e:
            logger.error(f"Error importing repository: {e}")
            raise Exception(f"Failed to import repository: {str(e)}")

    def start_sync_session(self, project_id: int, session_id: str) -> None:
        """Start a new sync session for tracking changes"""
        self.sync_sessions[session_id] = {
            "project_id": project_id,
            "files_changed": [],
            "start_time": datetime.now(),
            "status": "active"
        }
        logger.info(f"Started sync session {session_id} for project {project_id}")

    def track_file_change(self, session_id: str, file_path: str) -> None:
        """Track a file change in the current sync session"""
        if session_id in self.sync_sessions:
            session = self.sync_sessions[session_id]
            if file_path not in session["files_changed"]:
                session["files_changed"].append(file_path)

    async def commit_session_changes(
        self,
        session_id: str,
        commit_message: Optional[str] = None
    ) -> Optional[GitHubCommit]:
        """Commit all changes from a sync session"""
        if session_id not in self.sync_sessions:
            raise Exception(f"Sync session {session_id} not found")

        session = self.sync_sessions[session_id]
        project_id = session["project_id"]
        files_changed = session["files_changed"]

        if not files_changed:
            logger.info(f"No changes to commit for session {session_id}")
            return None

        try:
            project_path = f"{settings.projects_dir}/{project_id}"
            repo = git.Repo(project_path)

            # Add all changed files
            for file_path in files_changed:
                full_path = os.path.join(project_path, file_path)
                if os.path.exists(full_path):
                    repo.index.add([file_path])

            # Generate commit message if not provided
            if not commit_message:
                commit_message = f"Auto-commit: {len(files_changed)} files changed"
                if len(files_changed) <= 3:
                    commit_message += f" ({', '.join(files_changed)})"

            # Commit changes
            commit = repo.index.commit(commit_message)

            # Push to remote
            origin = repo.remote(name='origin')
            origin.push()

            # Mark session as completed
            session["status"] = "completed"
            session["commit_sha"] = commit.hexsha

            # Get remote URL for commit
            remote_url = origin.url.replace('.git', f'/commit/{commit.hexsha}')

            github_commit = GitHubCommit(
                sha=commit.hexsha,
                message=commit.message,
                url=remote_url,
                files_changed=len(files_changed),
                timestamp=datetime.fromtimestamp(commit.committed_date)
            )

            logger.info(f"Successfully committed {len(files_changed)} files for session {session_id}")
            return github_commit

        except Exception as e:
            session["status"] = "failed"
            logger.error(f"Error committing changes for session {session_id}: {e}")
            raise Exception(f"Failed to commit changes: {str(e)}")

    def end_sync_session(self, session_id: str) -> Dict:
        """End a sync session and return summary"""
        if session_id not in self.sync_sessions:
            raise Exception(f"Sync session {session_id} not found")

        session = self.sync_sessions[session_id]
        session["end_time"] = datetime.now()

        summary = {
            "session_id": session_id,
            "project_id": session["project_id"],
            "files_changed": len(session["files_changed"]),
            "duration": (session["end_time"] - session["start_time"]).total_seconds(),
            "status": session["status"]
        }

        # Clean up session
        del self.sync_sessions[session_id]

        return summary

    async def get_repository_info(self, repo_url: str) -> GitHubRepo:
        """Get information about a GitHub repository"""
        try:
            # Extract owner and repo name from URL
            if repo_url.endswith('.git'):
                repo_url = repo_url[:-4]

            parts = repo_url.replace('https://github.com/', '').split('/')
            if len(parts) != 2:
                raise Exception("Invalid GitHub repository URL")

            owner, name = parts
            repo = self.github.get_repo(f"{owner}/{name}")

            return GitHubRepo(
                name=repo.name,
                owner=repo.owner.login,
                url=repo.clone_url,
                private=repo.private,
                description=repo.description
            )
        except Exception as e:
            logger.error(f"Error getting repository info: {e}")
            raise Exception(f"Failed to get repository info: {str(e)}")

    def get_user_repositories(self, page: int = 1, per_page: int = 30) -> List[GitHubRepo]:
        """Get user's GitHub repositories"""
        try:
            repos = self.user.get_repos(
                type='all',
                sort='updated',
                direction='desc'
            )

            # Paginate results
            start = (page - 1) * per_page
            end = start + per_page

            repo_list = []
            for i, repo in enumerate(repos):
                if i < start:
                    continue
                if i >= end:
                    break

                repo_list.append(GitHubRepo(
                    name=repo.name,
                    owner=repo.owner.login,
                    url=repo.clone_url,
                    private=repo.private,
                    description=repo.description
                ))

            return repo_list
        except Exception as e:
            logger.error(f"Error getting user repositories: {e}")
            raise Exception(f"Failed to get repositories: {str(e)}")
```

## Acceptance Criteria

- [x] GitHub service integrated with PyGithub
- [x] Repository creation with template support
- [x] Repository import/cloning functionality
- [x] Sync session tracking for batch commits
- [x] Auto-commit functionality with file tracking
