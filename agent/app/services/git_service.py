import subprocess
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

class GitService:
    """Enhanced GitService with revert functionality for session management"""

    def checkout_commit(self, session_path: Path, commit_sha: str) -> bool:
        """
        Checkout specific commit in session directory

        Args:
            session_path: Path to session directory
            commit_sha: Git commit SHA to checkout

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            logger.info(f"Checking out commit {commit_sha} in {session_path}")

            # Ensure we're in the right directory
            if not (session_path / '.git').exists():
                logger.error(f"No git repository found in {session_path}")
                return False

            # Checkout the specific commit (detached HEAD state)
            result = subprocess.run(
                ['git', 'checkout', commit_sha],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                logger.error(f"Git checkout failed: {result.stderr}")
                return False

            logger.info(f"✅ Successfully checked out commit {commit_sha}")
            return True

        except Exception as e:
            logger.error(f"❌ Error during git checkout: {e}")
            return False

    def create_backup_commit(self, session_path: Path, message: str) -> Optional[str]:
        """
        Create a backup commit before reverting

        Args:
            session_path: Path to session directory
            message: Commit message for backup

        Returns:
            Optional[str]: Commit SHA if successful, None otherwise
        """
        try:
            # Check if there are any changes to commit
            status_result = subprocess.run(
                ['git', 'status', '--porcelain'],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            if not status_result.stdout.strip():
                logger.info("No changes to backup")
                return None

            # Add all changes
            subprocess.run(
                ['git', 'add', '.'],
                cwd=session_path,
                capture_output=True
            )

            # Create backup commit
            commit_result = subprocess.run(
                ['git', 'commit', '-m', message],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            if commit_result.returncode != 0:
                logger.error(f"Backup commit failed: {commit_result.stderr}")
                return None

            # Get the new commit SHA
            sha_result = subprocess.run(
                ['git', 'rev-parse', 'HEAD'],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            backup_sha = sha_result.stdout.strip()
            logger.info(f"✅ Created backup commit: {backup_sha}")
            return backup_sha

        except Exception as e:
            logger.error(f"❌ Error creating backup commit: {e}")
            return None

    def get_current_commit_sha(self, session_path: Path) -> Optional[str]:
        """
        Get current commit SHA in session directory

        Args:
            session_path: Path to session directory

        Returns:
            Optional[str]: Current commit SHA or None if error
        """
        try:
            result = subprocess.run(
                ['git', 'rev-parse', 'HEAD'],
                cwd=session_path,
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                return result.stdout.strip()
            else:
                logger.error(f"Failed to get current commit: {result.stderr}")
                return None

        except Exception as e:
            logger.error(f"❌ Error getting current commit: {e}")
            return None