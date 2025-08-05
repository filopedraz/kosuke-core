import logging
import shutil
from datetime import datetime
from pathlib import Path

import git

from app.utils.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages isolated session environments for chat sessions.

    Each chat session gets its own directory with a complete git checkout,
    allowing for complete isolation between sessions.
    """

    def __init__(self):
        self.sessions: dict[str, dict] = {}
        logger.info("SessionManager initialized")

    def create_session_environment(self, project_id: int, session_id: str, base_branch: str = "main") -> str:
        """
        Create isolated environment for chat session.

        1. Create session directory: /projects/{project_id}/sessions/{session_id}/
        2. Clone repository to session directory
        3. Checkout base_branch (from project.default_branch)
        4. Create session branch: kosuke/chat-{session_id}
        5. Return session directory path

        Args:
            project_id: Project identifier
            session_id: Unique session identifier
            base_branch: Branch to create session from (default: main)

        Returns:
            str: Path to session directory

        Raises:
            Exception: If session creation fails
        """
        try:
            # Define paths
            main_project_path = Path(settings.projects_dir) / str(project_id)
            sessions_dir = Path(settings.projects_dir) / str(project_id) / "sessions"
            session_path = sessions_dir / session_id

            logger.info(f"Creating session environment for {session_id} in project {project_id}")

            # Ensure main project exists
            if not main_project_path.exists():
                raise Exception(f"Main project directory does not exist: {main_project_path}")

            # Create sessions directory if it doesn't exist
            sessions_dir.mkdir(exist_ok=True)

            # Remove existing session directory if it exists
            if session_path.exists():
                logger.warning(f"Session directory already exists, removing: {session_path}")
                shutil.rmtree(session_path)

            # Clone the main project to the session directory
            logger.info(f"Cloning project from {main_project_path} to {session_path}")
            main_repo = git.Repo(main_project_path)

            # Get the remote URL from the main repository
            remote_url = main_repo.remote().url

            # Clone the repository to session directory
            session_repo = git.Repo.clone_from(remote_url, session_path)

            # Checkout the base branch
            logger.info(f"Checking out base branch: {base_branch}")
            try:
                session_repo.git.checkout(base_branch)
            except git.exc.GitCommandError as e:
                logger.warning(f"Failed to checkout {base_branch}, using current branch: {e}")

            # Create session-specific branch
            session_branch_name = f"kosuke/chat-{session_id}"
            logger.info(f"Creating session branch: {session_branch_name}")

            try:
                session_repo.create_head(session_branch_name)
                session_repo.heads[session_branch_name].checkout()
                logger.info(f"Successfully created and checked out session branch: {session_branch_name}")
            except git.exc.GitCommandError as e:
                logger.error(f"Failed to create session branch: {e}")
                # Continue with current branch if branch creation fails

            # Track session
            self.sessions[session_id] = {
                "project_id": project_id,
                "session_path": str(session_path),
                "branch_name": session_branch_name,
                "base_branch": base_branch,
                "created_at": datetime.now(),
                "status": "active",
            }

            logger.info(f"✅ Session environment created successfully: {session_path}")
            return str(session_path)

        except Exception as e:
            logger.error(f"❌ Failed to create session environment for {session_id}: {e}")
            # Cleanup on failure
            if session_path.exists():
                try:
                    shutil.rmtree(session_path)
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup failed session directory: {cleanup_error}")
            raise Exception(f"Failed to create session environment: {e}") from e

    def cleanup_session_environment(self, project_id: int, session_id: str) -> bool:
        """
        Clean up session environment when session ends.

        1. Remove session directory
        2. Free up disk space
        3. Update session status to 'cleaned'

        Args:
            project_id: Project identifier
            session_id: Session identifier

        Returns:
            bool: True if cleanup successful, False otherwise
        """
        try:
            session_path = Path(settings.projects_dir) / str(project_id) / "sessions" / session_id

            if session_path.exists():
                logger.info(f"Cleaning up session environment: {session_path}")
                shutil.rmtree(session_path)
                logger.info(f"✅ Session directory removed: {session_path}")
            else:
                logger.warning(f"Session directory not found for cleanup: {session_path}")

            # Update session status
            if session_id in self.sessions:
                self.sessions[session_id]["status"] = "cleaned"
                logger.info(f"Session {session_id} marked as cleaned")

            return True

        except Exception as e:
            logger.error(f"❌ Failed to cleanup session environment for {session_id}: {e}")
            return False

    def get_session_path(self, project_id: int, session_id: str) -> str:
        """
        Get the file system path for a session.

        Args:
            project_id: Project identifier
            session_id: Session identifier

        Returns:
            str: Path to session directory
        """
        session_path = Path(settings.projects_dir) / str(project_id) / "sessions" / session_id
        return str(session_path)

    def get_session_info(self, session_id: str) -> dict | None:
        """
        Get information about a session.

        Args:
            session_id: Session identifier

        Returns:
            dict | None: Session information or None if not found
        """
        return self.sessions.get(session_id)

    def list_active_sessions(self, project_id: int) -> dict[str, dict]:
        """
        List all active sessions for a project.

        Args:
            project_id: Project identifier

        Returns:
            Dict[str, Dict]: Dictionary of active sessions
        """
        active_sessions = {}
        for session_id, session_info in self.sessions.items():
            if session_info["project_id"] == project_id and session_info["status"] == "active":
                active_sessions[session_id] = session_info

        return active_sessions

    def end_session(self, session_id: str) -> dict:
        """
        End a session and return summary.

        Args:
            session_id: Session identifier

        Returns:
            Dict: Session summary
        """
        if session_id not in self.sessions:
            raise Exception(f"Session {session_id} not found")

        session = self.sessions[session_id]
        session["end_time"] = datetime.now()
        session["status"] = "ended"

        summary = {
            "session_id": session_id,
            "project_id": session["project_id"],
            "duration": (session["end_time"] - session["created_at"]).total_seconds(),
            "status": session["status"],
            "branch_name": session.get("branch_name"),
        }

        logger.info(f"Session {session_id} ended: {summary}")
        return summary

    def validate_session_directory(self, project_id: int, session_id: str) -> bool:
        """
        Validate that session directory exists and is properly set up.

        Args:
            project_id: Project identifier
            session_id: Session identifier

        Returns:
            bool: True if session directory is valid
        """
        try:
            session_path = Path(self.get_session_path(project_id, session_id))

            # Check if directory exists
            if not session_path.exists():
                logger.warning(f"Session directory does not exist: {session_path}")
                return False

            # Check if it's a git repository
            try:
                git.Repo(session_path)
                logger.debug(f"Session directory is valid git repository: {session_path}")
                return True
            except git.exc.InvalidGitRepositoryError:
                logger.error(f"Session directory is not a valid git repository: {session_path}")
                return False

        except Exception as e:
            logger.error(f"Error validating session directory: {e}")
            return False
