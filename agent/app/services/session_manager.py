import logging
from pathlib import Path

from app.utils.config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages session operations for the Python microservice.

    Provides utility methods for session path management.
    """

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
