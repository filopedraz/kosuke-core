import logging
from pathlib import Path

import git
from github import Github

logger = logging.getLogger(__name__)


class GitHubService:
    """
    GitHubService for Python microservice operations.

    Handles Git operations that are still managed by the Python service:
    - Authenticated fetch for pull operations
    - Commit checkout for revert operations
    - Backup commit creation for revert operations
    """

    def __init__(self, github_token: str):
        self.github_token = github_token

        self.github = Github(github_token) if github_token else None
        self.user = self.github.get_user() if self.github else None

    def checkout_commit(self, session_path: Path, commit_sha: str) -> bool:
        """
        Checkout specific commit in session directory.

        Used by revert operations to restore a previous state.

        Args:
            session_path: Path to session directory
            commit_sha: Git commit SHA to checkout

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            logger.info(f"Checking out commit {commit_sha} in {session_path}")

            # Ensure we're in the right directory
            if not (session_path / ".git").exists():
                logger.error(f"No git repository found in {session_path}")
                return False

            # Use GitPython for checkout
            repo = git.Repo(session_path)

            # Checkout the specific commit (detached HEAD state)
            repo.git.checkout(commit_sha)

            logger.info(f"✅ Successfully checked out commit {commit_sha}")
            return True

        except Exception as e:
            logger.error(f"❌ Error during git checkout: {e}")
            return False

    def create_backup_commit(self, session_path: Path, message: str) -> str | None:
        """
        Create a backup commit before reverting.

        Used by revert operations to preserve current state before restoring.

        Args:
            session_path: Path to session directory
            message: Commit message for backup

        Returns:
            str | None: Commit SHA if successful, None otherwise
        """
        try:
            repo = git.Repo(session_path)

            # Check if there are any changes to commit
            if not repo.is_dirty(untracked_files=True):
                logger.info("No changes to backup")
                return None

            # Add all changes
            repo.git.add(".")

            # Create backup commit
            commit = repo.index.commit(message)

            backup_sha = commit.hexsha
            logger.info(f"✅ Created backup commit: {backup_sha}")
            return backup_sha

        except Exception as e:
            logger.error(f"❌ Error creating backup commit: {e}")
            return None
