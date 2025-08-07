import logging
import shutil
from datetime import datetime
from datetime import timedelta
from pathlib import Path

import git

from app.utils.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages session metadata for git-based container approach.

    With the new git clone approach, sessions are managed entirely within containers.
    This class now tracks session metadata rather than managing filesystem directories.
    """

    def __init__(self):
        self.sessions: dict[str, dict] = {}
        logger.info("SessionManager initialized for git-based container approach")

    async def pull_main_branch(self, project_id: int, force: bool = False, default_branch: str = "main") -> dict:
        """
        Legacy method - git pulls now happen inside containers.
        This method is kept for API compatibility but returns a deprecation notice.
        """
        logger.warning(f"pull_main_branch called for project {project_id} - this operation now happens inside containers")
        return {
            "success": True,
            "action": "deprecated",
            "message": "Git operations now happen inside containers during clone",
            "commits_pulled": 0,
        }

    async def update_main_branch(self, project_id: int, default_branch: str = "main") -> dict:
        """
        Legacy method - git operations now happen inside containers.
        This method is kept for API compatibility but returns a deprecation notice.
        """
        logger.warning(f"update_main_branch called for project {project_id} - this operation now happens inside containers")
        return {
            "success": True,
            "action": "deprecated",
            "message": "Git operations now happen inside containers during clone",
            "commits_pulled": 0,
        }

    def create_session_environment(self, project_id: int, session_id: str, base_branch: str = "main") -> str:
        """
        Create session metadata for git-based container approach.

        With the new git clone approach, session environments are created inside containers.
        This method now only tracks session metadata.

        Args:
            project_id: Project identifier
            session_id: Unique session identifier
            base_branch: Branch to create session from (default: main)

        Returns:
            str: Virtual session path (for compatibility)
        """
        session_branch_name = f"kosuke/session-{session_id}"
        virtual_path = f"/app/sessions/{project_id}/{session_id}"
        
        logger.info(f"Creating session metadata for {session_id} in project {project_id}")
        logger.info(f"Session branch: {session_branch_name}")
        logger.info(f"Git clone and branching will happen inside container")

        # Track session metadata
        self.sessions[session_id] = {
            "project_id": project_id,
            "session_path": virtual_path,
            "branch_name": session_branch_name,
            "base_branch": base_branch,
            "created_at": datetime.now(),
            "status": "active",
            "approach": "git_clone_container",
        }

        logger.info(f"✅ Session metadata created successfully for {session_id}")
        return virtual_path

    def cleanup_session_environment(self, project_id: int, session_id: str) -> bool:
        """
        Clean up session metadata when session ends.

        With git-based containers, cleanup only involves removing session metadata.
        Container cleanup is handled by DockerService.

        Args:
            project_id: Project identifier
            session_id: Session identifier

        Returns:
            bool: True if cleanup successful, False otherwise
        """
        try:
            logger.info(f"Cleaning up session metadata for {session_id} in project {project_id}")

            # Update session status
            if session_id in self.sessions:
                self.sessions[session_id]["status"] = "cleaned"
                logger.info(f"Session {session_id} marked as cleaned")
            else:
                logger.warning(f"Session {session_id} not found in metadata")

            logger.info(f"✅ Session metadata cleaned for {session_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to cleanup session metadata for {session_id}: {e}")
            return False

    def get_session_path(self, project_id: int, session_id: str) -> str:
        """
        Get the virtual session path for git-based container approach.

        With containers using git clone, this returns the container-internal path
        where the repository will be cloned.

        Args:
            project_id: Project identifier
            session_id: Session identifier

        Returns:
            str: Virtual container path where git repo will be cloned
        """
        # For git clone approach, all sessions use /app/workspace inside container
        return "/app/workspace"

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
        Validate session metadata for git-based container approach.

        With containers using git clone, validation checks if session metadata exists.

        Args:
            project_id: Project identifier
            session_id: Session identifier

        Returns:
            bool: True if session metadata is valid
        """
        try:
            # Check if session metadata exists
            if session_id in self.sessions:
                session = self.sessions[session_id]
                if session["project_id"] == project_id and session["status"] == "active":
                    logger.debug(f"Session {session_id} metadata is valid for project {project_id}")
                    return True
                else:
                    logger.warning(f"Session {session_id} metadata mismatch or inactive")
                    return False
            else:
                logger.warning(f"Session {session_id} metadata does not exist")
                return False

        except Exception as e:
            logger.error(f"Error validating session metadata: {e}")
            return False

    async def pull_session_branch(self, project_id: int, session_id: str, force: bool = False) -> dict:
        """
        Legacy method - git pulls now happen inside containers.
        This method is kept for API compatibility but returns a deprecation notice.
        """
        logger.warning(f"pull_session_branch called for project {project_id} session {session_id} - this operation now happens inside containers")
        return {
            "success": True,
            "action": "deprecated",
            "message": "Git operations now happen inside containers",
            "commits_pulled": 0,
            "branch_name": f"kosuke/session-{session_id}",
        }
