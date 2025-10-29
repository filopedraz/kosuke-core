import logging
from datetime import datetime
from pathlib import Path

import git

from app.utils.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages session operations for the Python microservice.

    Handles remaining Python-side session operations:
    - Get session paths for Git operations
    - Pull session branches from remote
    """

    def __init__(self):
        # Track last pull time per session for caching policies
        self.last_session_pull: dict[tuple[int, str], datetime] = {}
        logger.info("SessionManager initialized")

    def get_session_path(self, project_id: int, session_id: str) -> str:
        """
        Get the file system path for a session.

        Args:
            project_id: Project identifier
            session_id: Session identifier

        Returns:
            str: Path to session directory
        """
        # All sessions, including default branch, use dedicated session directories
        session_path = Path(settings.projects_dir) / str(project_id) / "sessions" / session_id
        return str(session_path)

    def _fetch_remote_changes(self, repo: git.Repo, github_service=None) -> None:
        """Fetch latest changes from remote repository."""
        if github_service is not None and getattr(github_service, "github_token", ""):
            github_service.fetch_with_auth(repo)
        else:
            repo.remotes.origin.fetch()

    def _check_remote_branch_exists(self, repo: git.Repo, remote_branch: str) -> bool:
        """Check if remote branch exists."""
        try:
            repo.commit(remote_branch)
            return True
        except git.exc.BadName:
            return False

    def _count_commits_pulled(self, repo: git.Repo, current_commit: str, new_commit: str, session_id: str) -> int:
        """Count commits pulled between two commits."""
        if current_commit == new_commit:
            logger.info(f"No new commits for session {session_id}")
            return 0

        try:
            commits = list(repo.iter_commits(f"{current_commit}..{new_commit}"))
            commits_pulled = len(commits)
            logger.info(f"Pulled {commits_pulled} new commits for session {session_id}")
            return commits_pulled
        except git.exc.GitCommandError:
            logger.info(f"Updated session {session_id} (commit count unavailable)")
            return 1

    def _create_success_response(
        self, action: str, commits_pulled: int, session_branch_name: str, current_commit: str = "", new_commit: str = ""
    ) -> dict:
        """Create a success response dictionary."""
        now = datetime.now()
        response = {
            "success": True,
            "action": action,
            "commits_pulled": commits_pulled,
            "last_pull_time": now.isoformat(),
            "branch_name": session_branch_name,
        }

        if action == "no_remote":
            response["message"] = "No remote branch found, session is up to date"
        elif action == "pulled":
            response.update(
                {
                    "message": f"Updated with {commits_pulled} new commits"
                    if commits_pulled > 0
                    else "Already up to date",
                    "previous_commit": current_commit[:8],
                    "new_commit": new_commit[:8],
                }
            )

        return response

    def _create_error_response(self, error: Exception, session_id: str) -> dict:
        """Create an error response dictionary."""
        return {
            "success": False,
            "action": "error",
            "message": f"Failed to pull session branch: {error}",
            "commits_pulled": 0,
            "error": str(error),
            "branch_name": f"{settings.session_branch_prefix}{session_id}",
        }

    async def pull_session_branch(
        self, project_id: int, session_id: str, force: bool = False, github_service=None
    ) -> dict:
        """
        Pull latest changes for a session branch from its remote branch.

        Args:
            project_id: Project identifier
            session_id: Session identifier
            force: If True, always pull (ignored for now, sessions always pull)
            github_service: Optional GitHubService for authenticated operations

        Returns:
            dict: Update status with success/error information and commit count
        """
        try:
            session_path = Path(self.get_session_path(project_id, session_id))

            if not session_path.exists():
                raise Exception(f"Session directory does not exist: {session_path}")

            repo = git.Repo(session_path)
            session_branch_name = f"{settings.session_branch_prefix}{session_id}"
            current_commit = repo.head.commit.hexsha

            logger.info(f"Pulling session branch {session_branch_name} for project {project_id}")

            # Fetch latest changes from remote
            logger.info(f"Fetching latest changes for session {session_id}")
            self._fetch_remote_changes(repo, github_service)

            # Check if remote branch exists
            remote_branch = f"origin/{session_branch_name}"
            if not self._check_remote_branch_exists(repo, remote_branch):
                logger.info(f"Remote branch {session_branch_name} doesn't exist, no changes to pull")
                return self._create_success_response("no_remote", 0, session_branch_name)

            # Hard reset to remote session branch
            logger.info(f"Performing hard reset to {remote_branch}")
            repo.git.reset("--hard", remote_branch)

            # Count commits pulled
            new_commit = repo.head.commit.hexsha
            commits_pulled = self._count_commits_pulled(repo, current_commit, new_commit, session_id)

            return self._create_success_response(
                "pulled", commits_pulled, session_branch_name, current_commit, new_commit
            )

        except Exception as e:
            logger.error(f"❌ Failed to pull session branch for project {project_id} session {session_id}: {e}")
            return self._create_error_response(e, session_id)
