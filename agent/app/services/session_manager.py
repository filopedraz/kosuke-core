import logging
import shutil
from datetime import datetime
from datetime import timedelta
from pathlib import Path

import git

from app.services.git_utils import sanitize_github_remote_url
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
        # Track last pull time for main branches per project
        self.last_main_pull: dict[int, datetime] = {}
        self.PULL_CACHE_MINUTES = settings.git_pull_cache_minutes
        logger.info("SessionManager initialized")

    def _sanitize_remote_url(self, repo_url: str) -> str:
        return sanitize_github_remote_url(repo_url)

    async def pull_main_branch(
        self,
        project_id: int,
        force: bool = False,
        default_branch: str = "main",
        github_service=None,
    ) -> dict:
        """
        Pull latest changes for main project directory (manual operation).
        Always performs pull when called, ignoring cache unless force=False.

        Args:
            project_id: Project identifier
            force: If True, always pull. If False, respect cache
            default_branch: Default branch to pull from

        Returns:
            dict: Update status with success/error information and commit count
        """
        try:
            main_project_path = Path(settings.projects_dir) / str(project_id)

            # Check cache only if force=False
            if not force:
                last_pull = self.last_main_pull.get(project_id)
                now = datetime.now()

                if last_pull and (now - last_pull) < timedelta(minutes=self.PULL_CACHE_MINUTES):
                    minutes_since_pull = int((now - last_pull).total_seconds() / 60)
                    logger.info(
                        f"Skipping git pull for project {project_id} - last pulled {minutes_since_pull} minutes ago"
                    )
                    return {
                        "success": True,
                        "action": "cached",
                        "message": f"Using cached version from {minutes_since_pull} minutes ago",
                        "commits_pulled": 0,
                        "last_pull_time": last_pull.isoformat(),
                    }

            # Ensure main project exists
            if not main_project_path.exists():
                raise Exception(f"Main project directory does not exist: {main_project_path}")

            # Initialize git repo
            repo = git.Repo(main_project_path)

            # Get current commit hash before pull
            current_commit = repo.head.commit.hexsha

            logger.info(f"Pulling main branch for project {project_id} from {default_branch}")

            try:
                # Fetch latest changes (use authenticated fetch when token is provided)
                logger.info(f"Fetching latest changes for project {project_id}")
                if github_service is not None and getattr(github_service, "github_token", ""):
                    github_service.fetch_with_auth(repo)
                else:
                    repo.remotes.origin.fetch()

                # Always use hard reset for manual pulls
                logger.info(f"Performing hard reset for project {project_id}")
                repo.git.reset("--hard", f"origin/{default_branch}")

            except git.exc.GitCommandError as e:
                logger.error(f"Hard reset failed for project {project_id}: {e}")
                raise Exception(f"Failed to pull: {e}") from e

            # Get new commit hash and count commits pulled
            new_commit = repo.head.commit.hexsha
            commits_pulled = 0

            if current_commit != new_commit:
                # Count commits between old and new
                try:
                    commits = list(repo.iter_commits(f"{current_commit}..{new_commit}"))
                    commits_pulled = len(commits)
                    logger.info(f"Pulled {commits_pulled} new commits for project {project_id}")
                except git.exc.GitCommandError:
                    # If we can't count commits, at least we know something changed
                    commits_pulled = 1
                    logger.info(f"Updated project {project_id} (commit count unavailable)")
            else:
                logger.info(f"No new commits for project {project_id}")

            # Update cache
            now = datetime.now()
            self.last_main_pull[project_id] = now

            return {
                "success": True,
                "action": "pulled",
                "message": f"Updated with {commits_pulled} new commits" if commits_pulled > 0 else "Already up to date",
                "commits_pulled": commits_pulled,
                "last_pull_time": now.isoformat(),
                "previous_commit": current_commit[:8],
                "new_commit": new_commit[:8],
            }

        except Exception as e:
            logger.error(f"❌ Failed to pull main branch for project {project_id}: {e}")
            return {
                "success": False,
                "action": "error",
                "message": f"Failed to pull: {e}",
                "commits_pulled": 0,
                "error": str(e),
            }

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
            main_project_path, sessions_dir, session_path = self._get_session_paths(project_id, session_id)
            logger.info(f"Creating session environment for {session_id} in project {project_id}")

            self._assert_main_project_exists(main_project_path)
            self._prepare_session_directory(sessions_dir, session_path)

            session_repo, main_repo = self._clone_from_local_project(main_project_path, session_path)
            self._configure_session_origin(session_repo, main_repo)

            self._checkout_base_branch(session_repo, base_branch)
            session_branch_name = self._create_session_branch(session_repo, session_id)

            self._track_new_session(
                session_id=session_id,
                project_id=project_id,
                session_path=session_path,
                base_branch=base_branch,
                session_branch_name=session_branch_name,
            )

            logger.info(f"✅ Session environment created successfully: {session_path}")
            return str(session_path)

        except Exception as e:
            logger.error(f"❌ Failed to create session environment for {session_id}: {e}")
            self._cleanup_failed_session_dir(project_id, session_id)
            raise Exception(f"Failed to create session environment: {e}") from e

    def _get_session_paths(self, project_id: int, session_id: str) -> tuple[Path, Path, Path]:
        """Compute main project path, sessions directory, and session path."""
        main_project_path = Path(settings.projects_dir) / str(project_id)
        sessions_dir = Path(settings.projects_dir) / str(project_id) / "sessions"
        session_path = sessions_dir / session_id
        return main_project_path, sessions_dir, session_path

    def _assert_main_project_exists(self, main_project_path: Path) -> None:
        """Raise if the main project directory does not exist."""
        if not main_project_path.exists():
            raise Exception(f"Main project directory does not exist: {main_project_path}")

    def _prepare_session_directory(self, sessions_dir: Path, session_path: Path) -> None:
        """Create sessions dir and ensure a clean session path."""
        sessions_dir.mkdir(exist_ok=True)
        if session_path.exists():
            logger.warning(f"Session directory already exists, removing: {session_path}")
            shutil.rmtree(session_path)

    def _clone_from_local_project(self, main_project_path: Path, session_path: Path) -> tuple[git.Repo, git.Repo]:
        """Clone from local project directory to session path to avoid auth prompts."""
        logger.info(f"Cloning project from {main_project_path} to {session_path}")
        main_repo = git.Repo(main_project_path)
        session_repo = git.Repo.clone_from(str(main_project_path), session_path)
        return session_repo, main_repo

    def _configure_session_origin(self, session_repo: git.Repo, main_repo: git.Repo) -> None:
        """Set the session repo origin to the sanitized remote of the main repo if available."""
        try:
            main_remote_url = next(main_repo.remotes.origin.urls)
        except Exception:
            main_remote_url = None

        if main_remote_url:
            try:
                sanitized_remote = self._sanitize_remote_url(main_remote_url)
                session_repo.remotes.origin.set_url(sanitized_remote)
                logger.debug(f"Set session origin remote to {sanitized_remote}")
            except Exception as remote_error:
                logger.debug(f"Failed to set session origin remote: {remote_error}")

    def _checkout_base_branch(self, session_repo: git.Repo, base_branch: str) -> None:
        """Checkout the base branch if present; otherwise keep current branch."""
        logger.info(f"Checking out base branch: {base_branch}")
        try:
            session_repo.git.checkout(base_branch)
        except git.exc.GitCommandError as checkout_error:
            logger.warning(f"Failed to checkout {base_branch}, using current branch: {checkout_error}")

    def _create_session_branch(self, session_repo: git.Repo, session_id: str) -> str:
        """Create and checkout the session-specific branch, returns branch name."""
        session_branch_name = f"{settings.session_branch_prefix}{session_id}"
        logger.info(f"Creating session branch: {session_branch_name}")
        try:
            session_repo.create_head(session_branch_name)
            session_repo.heads[session_branch_name].checkout()
            logger.info(f"Successfully created and checked out session branch: {session_branch_name}")
        except git.exc.GitCommandError as create_error:
            logger.error(f"Failed to create session branch: {create_error}")
        return session_branch_name

    def _track_new_session(
        self,
        *,
        session_id: str,
        project_id: int,
        session_path: Path,
        base_branch: str,
        session_branch_name: str,
    ) -> None:
        """Record session metadata in memory."""
        self.sessions[session_id] = {
            "project_id": project_id,
            "session_path": str(session_path),
            "branch_name": session_branch_name,
            "base_branch": base_branch,
            "created_at": datetime.now(),
            "status": "active",
        }

    def _cleanup_failed_session_dir(self, project_id: int, session_id: str) -> None:
        """Remove session directory if creation failed."""
        session_path = Path(settings.projects_dir) / str(project_id) / "sessions" / session_id
        if session_path.exists():
            try:
                shutil.rmtree(session_path)
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup failed session directory: {cleanup_error}")

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
        # Special case: "main" session uses main project directory
        if session_id == "main":
            main_project_path = Path(settings.projects_dir) / str(project_id)
            return str(main_project_path)

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
                if session_id == "main":
                    logger.debug(f"Main project directory is valid git repository: {session_path}")
                else:
                    logger.debug(f"Session directory is valid git repository: {session_path}")
                return True
            except git.exc.InvalidGitRepositoryError:
                if session_id == "main":
                    logger.error(f"Main project directory is not a valid git repository: {session_path}")
                else:
                    logger.error(f"Session directory is not a valid git repository: {session_path}")
                return False

        except Exception as e:
            logger.error(f"Error validating session directory: {e}")
            return False

    async def pull_session_branch(
        self, project_id: int, session_id: str, force: bool = False, github_service=None
    ) -> dict:
        """
        Pull latest changes for a session branch from its remote branch.

        Args:
            project_id: Project identifier
            session_id: Session identifier
            force: If True, always pull (ignored for now, sessions always pull)

        Returns:
            dict: Update status with success/error information and commit count
        """
        try:
            session_path = Path(self.get_session_path(project_id, session_id))

            # Ensure session directory exists
            if not session_path.exists():
                raise Exception(f"Session directory does not exist: {session_path}")

            # Initialize git repo
            repo = git.Repo(session_path)

            # Get the session branch name
            session_branch_name = f"kosuke/chat-{session_id}"

            # Get current commit hash before pull
            current_commit = repo.head.commit.hexsha

            logger.info(f"Pulling session branch {session_branch_name} for project {project_id}")

            # Fetch latest changes from remote (use authenticated fetch if provided)
            logger.info(f"Fetching latest changes for session {session_id}")
            if github_service is not None and getattr(github_service, "github_token", ""):
                github_service.fetch_with_auth(repo)
            else:
                repo.remotes.origin.fetch()

            # Check if remote branch exists
            remote_branch = f"origin/{session_branch_name}"
            try:
                repo.commit(remote_branch)
                remote_exists = True
            except git.exc.BadName:
                remote_exists = False
                logger.info(f"Remote branch {session_branch_name} doesn't exist, no changes to pull")

            if remote_exists:
                # Hard reset to remote session branch
                logger.info(f"Performing hard reset to {remote_branch}")
                repo.git.reset("--hard", remote_branch)
            else:
                # No remote branch exists yet, this is normal for new sessions
                logger.info(f"No remote branch {session_branch_name} found, session is up to date")
                return {
                    "success": True,
                    "action": "no_remote",
                    "message": "No remote branch found, session is up to date",
                    "commits_pulled": 0,
                    "last_pull_time": datetime.now().isoformat(),
                }

            # Get new commit hash and count commits pulled
            new_commit = repo.head.commit.hexsha
            commits_pulled = 0

            if current_commit != new_commit:
                # Count commits between old and new
                try:
                    commits = list(repo.iter_commits(f"{current_commit}..{new_commit}"))
                    commits_pulled = len(commits)
                    logger.info(f"Pulled {commits_pulled} new commits for session {session_id}")
                except git.exc.GitCommandError:
                    # If we can't count commits, at least we know something changed
                    commits_pulled = 1
                    logger.info(f"Updated session {session_id} (commit count unavailable)")
            else:
                logger.info(f"No new commits for session {session_id}")

            now = datetime.now()
            return {
                "success": True,
                "action": "pulled",
                "message": f"Updated with {commits_pulled} new commits" if commits_pulled > 0 else "Already up to date",
                "commits_pulled": commits_pulled,
                "last_pull_time": now.isoformat(),
                "previous_commit": current_commit[:8],
                "new_commit": new_commit[:8],
                "branch_name": session_branch_name,
            }

        except Exception as e:
            logger.error(f"❌ Failed to pull session branch for project {project_id} session {session_id}: {e}")
            return {
                "success": False,
                "action": "error",
                "message": f"Failed to pull session branch: {e}",
                "commits_pulled": 0,
                "error": str(e),
                "branch_name": f"{settings.session_branch_prefix}{session_id}",
            }
