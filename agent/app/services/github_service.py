import logging
import shutil
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import git
import requests
from github import Github

from app.models.github import CreateRepoRequest
from app.models.github import GitHubCommit
from app.models.github import GitHubRepo
from app.models.github import ImportRepoRequest
from app.services.session_manager import SessionManager
from app.utils.config import settings

logger = logging.getLogger(__name__)


class GitHubService:
    def __init__(self, github_token: str):
        self.github_token = github_token
        self.session_manager = SessionManager()

        self.github = Github(github_token) if github_token else None
        self.user = self.github.get_user() if self.github else None

    def fetch_with_auth(self, repo: git.Repo, remote_name: str = "origin") -> None:
        """Perform an authenticated fetch on the given repository remote and restore the URL.

        This injects the token into the remote URL temporarily to support private repositories.
        """
        try:
            remote = repo.remote(name=remote_name)
            original_url = remote.url
            # Build authenticated URL similar to push
            if original_url.startswith("https://github.com/"):
                authenticated_url = original_url.replace(
                    "https://github.com/", f"https://oauth2:{self.github_token}@github.com/"
                )
            elif original_url.startswith("git@github.com:"):
                repo_path = original_url.replace("git@github.com:", "").replace(".git", "")
                authenticated_url = f"https://oauth2:{self.github_token}@github.com/{repo_path}.git"
            else:
                authenticated_url = original_url
                logger.warning(f"Unexpected remote URL format during fetch: {original_url}")

            # Temporarily set, fetch, then restore
            remote.set_url(authenticated_url)
            remote.fetch()
            remote.set_url(original_url)
        except Exception as e:
            logger.error(f"Error during authenticated fetch: {e}")
            raise

    def _make_authenticated_url(self, repo_url: str) -> str:
        """Return a GitHub HTTPS URL embedding the token for auth.

        - Supports both HTTPS and SSH input URLs
        - Returns original URL if no token is available
        - Never logs or returns token in logs elsewhere
        """
        token = self.github_token
        if not token:
            return repo_url

        # Ensure token is URL-safe in userinfo
        encoded_token = quote(token, safe="")

        try:
            if repo_url.startswith("git@github.com:"):
                # Convert SSH to HTTPS with token
                repo_path = repo_url.replace("git@github.com:", "")
                if not repo_path.endswith(".git"):
                    repo_path = f"{repo_path}.git"
                return f"https://oauth2:{encoded_token}@github.com/{repo_path}"

            if repo_url.startswith("https://github.com/"):
                # Insert token into HTTPS URL
                rest = repo_url.replace("https://github.com/", "")
                # Preserve .git if present; no need to force
                return f"https://oauth2:{encoded_token}@github.com/{rest}"

            # Fallback: return original
            return repo_url
        except Exception:
            # On any parsing error, fall back to original URL
            return repo_url

    def _make_sanitized_https_url(self, repo_url: str) -> str:
        """Return a sanitized HTTPS URL without credentials for origin config."""
        try:
            if repo_url.startswith("git@github.com:"):
                repo_path = repo_url.replace("git@github.com:", "")
                if not repo_path.endswith(".git"):
                    repo_path = f"{repo_path}.git"
                return f"https://github.com/{repo_path}"

            if repo_url.startswith("https://github.com/"):
                # Strip any embedded credentials if present
                rest = repo_url.split("github.com/", 1)[1]
                return f"https://github.com/{rest}"

            if repo_url.startswith("https://oauth2:") and "@github.com/" in repo_url:
                rest = repo_url.split("@github.com/", 1)[1]
                return f"https://github.com/{rest}"

            return repo_url
        except Exception:
            return repo_url

    async def create_repository(self, request: CreateRepoRequest) -> GitHubRepo:
        """Create a new GitHub repository from Kosuke template and clone it locally if project_id is provided."""
        try:
            template_repo = request.template_repo or settings.template_repository
            logger.info(f"Creating repository '{request.name}' from template: {template_repo}")

            # Validate template and user permissions
            self._validate_template_repository(template_repo)
            user_info = self._validate_user_permissions()
            self._check_repository_name_availability(request.name)

            # Create repository via GitHub API
            created_repo = await self._create_repository_from_template(request, template_repo, user_info)

            time.sleep(10)

            # Optionally clone locally if a project_id is provided
            if getattr(request, "project_id", None) is not None:
                try:
                    # Import here to avoid circular imports
                    from app.models.github import ImportRepoRequest  # noqa: PLC0415

                    clone_url = created_repo.url
                    project_id = int(request.project_id)  # type: ignore[arg-type]
                    await self.import_repository(ImportRepoRequest(repo_url=clone_url, project_id=project_id))
                except Exception as clone_error:
                    logger.error(f"Repository created but failed to clone locally: {clone_error}")

            return created_repo

        except Exception as e:
            logger.error(f"Error creating repository '{request.name}': {e}")
            self._reraise_meaningful_error(e)

    def _validate_template_repository(self, template_repo: str) -> None:
        """Validate that the template repository exists and is accessible"""
        try:
            template = self.github.get_repo(template_repo)
            logger.info(f"Template repository found: {template.full_name}, is_template: {template.is_template}")

            if not template.is_template:
                raise Exception(f"Repository {template_repo} is not marked as a template repository")

        except Exception as template_error:
            logger.error(f"Failed to access template repository '{template_repo}': {template_error}")
            raise Exception(
                f"Template repository '{template_repo}' is not accessible. "
                f"Please verify it exists and is marked as a template."
            ) from template_error

    def _validate_user_permissions(self):
        """Validate user permissions and return user info"""
        try:
            user_info = self.user
            logger.info(f"GitHub user: {user_info.login} (ID: {user_info.id})")
            return user_info
        except Exception as user_error:
            logger.error(f"Failed to get user info: {user_error}")
            raise Exception("Invalid GitHub token or insufficient permissions") from user_error

    def _check_repository_name_availability(self, repo_name: str) -> None:
        """Check if repository name is available"""
        try:
            existing_repo = self.user.get_repo(repo_name)
            if existing_repo:
                raise Exception(f"Repository '{repo_name}' already exists in your account")
        except Exception as check_error:
            # This is expected if repo doesn't exist
            logger.debug(f"Repository check (expected if doesn't exist): {check_error}")

    async def _create_repository_from_template(
        self, request: CreateRepoRequest, template_repo: str, user_info
    ) -> GitHubRepo:
        """Create repository from template using GitHub REST API"""
        try:
            # Parse template repository
            if "/" not in template_repo:
                raise Exception(f"Invalid template repository format: {template_repo}. Expected 'owner/repo'")

            template_owner, template_name = template_repo.split("/", 1)

            # Prepare API request
            headers = self._get_api_headers()
            payload = self._build_repository_payload(request, user_info)
            api_url = f"https://api.github.com/repos/{template_owner}/{template_name}/generate"

            logger.info(f"Making API call to: {api_url}")
            logger.debug(f"Payload: {payload}")

            # Make API call
            response = requests.post(api_url, json=payload, headers=headers, timeout=30)
            logger.info(f"Response from GitHub API after creating repository from template: {response.json()}")
            return self._handle_api_response(response, template_repo)

        except requests.exceptions.RequestException as req_error:
            logger.error(f"Request error: {req_error}")
            raise Exception(f"Failed to connect to GitHub API: {req_error}") from req_error
        except Exception as create_error:
            self._handle_creation_error(create_error)

    def _get_api_headers(self) -> dict:
        """Get GitHub API headers"""
        return {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def _build_repository_payload(self, request: CreateRepoRequest, user_info) -> dict:
        """Build payload for repository creation API"""
        return {
            "owner": user_info.login,
            "name": request.name,
            "description": request.description or "",
            "private": request.private or False,
            "include_all_branches": False,
        }

    def _handle_api_response(self, response: requests.Response, template_repo: str) -> GitHubRepo:
        """Handle GitHub API response"""
        if response.status_code == 201:
            repo_data = response.json()
            logger.info(f"Successfully created repository: {repo_data['full_name']}")

            return GitHubRepo(
                name=repo_data["name"],
                owner=repo_data["owner"]["login"],
                url=repo_data["clone_url"],
                private=repo_data["private"],
                description=repo_data["description"],
            )

        # Handle error responses
        error_msg = f"HTTP {response.status_code}: {response.text}"
        logger.error(f"Failed to create repository from template: {error_msg}")

        if response.status_code == 422:
            self._handle_validation_error(response)
        elif response.status_code == 403:
            raise Exception("Insufficient GitHub permissions. Ensure your token has 'repo' scope.") from None
        elif response.status_code == 404:
            raise Exception(f"Template repository '{template_repo}' not found or not accessible") from None

        raise Exception(f"GitHub API error: {error_msg}") from None

    def _handle_validation_error(self, response: requests.Response) -> None:
        """Handle 422 validation errors from GitHub API"""
        error_data = response.json()
        # GitHub returns either an array of strings or objects in `errors`
        errors_list = error_data.get("errors", [])
        for item in errors_list:
            # Support both dict and string shapes
            msg = str(item.get("message", "")).lower() if isinstance(item, dict) else str(item).lower()

            if "already exists" in msg or "name already exists" in msg:
                raise Exception("Repository name is already taken") from None

        error_message = str(error_data.get("message", "Unknown validation error"))
        raise Exception(f"Validation error: {error_message}") from None

    def _handle_creation_error(self, create_error: Exception) -> None:
        """Handle errors during repository creation"""
        meaningful_error_prefixes = (
            "Repository name",
            "Validation error",
            "Insufficient GitHub permissions",
            "Template repository",
            "GitHub API error",
            "Failed to connect to GitHub API",
        )
        if isinstance(create_error, Exception) and str(create_error).startswith(meaningful_error_prefixes):
            raise create_error
        logger.error(f"Failed to create repository from template: {create_error}")
        raise Exception(f"Unexpected error creating repository: {create_error}") from create_error

    def _reraise_meaningful_error(self, e: Exception) -> None:
        """Re-raise meaningful errors without wrapping"""
        meaningful_errors = (
            "Template repository",
            "Repository name",
            "GitHub API error",
            "Invalid GitHub token",
            "Insufficient GitHub permissions",
            "Validation error",
            "Failed to connect to GitHub API",
            "Unexpected error creating repository",
        )
        if str(e).startswith(meaningful_errors):
            raise e
        raise Exception(f"Failed to create repository: {e!s}") from e

    async def import_repository(self, request: ImportRepoRequest) -> str:
        """Import/clone a GitHub repository to local project"""
        try:
            project_path = Path(settings.projects_dir) / str(request.project_id)

            # Remove existing project directory if it exists
            if project_path.exists():
                shutil.rmtree(project_path)

            # Clone repository using authenticated URL to support private repos
            sanitized_for_log = self._make_sanitized_https_url(request.repo_url)
            auth_url = self._make_authenticated_url(request.repo_url)
            logger.info(f"Importing repository {sanitized_for_log} to project {request.project_id}")
            repo = git.Repo.clone_from(auth_url, project_path)

            # After clone, sanitize remote URL to remove token
            try:
                origin = repo.remote(name="origin")
                origin.set_url(self._make_sanitized_https_url(request.repo_url))
            except Exception as sanitize_error:
                # Non-fatal if we cannot sanitize
                logger.debug(f"Failed to sanitize remote URL after import: {sanitize_error}")

            # Keep repository on main branch after cloning
            # Branches will be created per chat session, not per project
            logger.info("Repository cloned and ready for chat-based branching")

            logger.info(f"Successfully imported repository to project {request.project_id}")
            return str(project_path)
        except Exception as e:
            logger.error(f"Error importing repository: {e}")
            raise Exception(f"Failed to import repository: {e!s}") from e

    async def commit_session_changes(
        self, session_path: str, session_id: str, commit_message: str | None = None
    ) -> GitHubCommit | None:
        """Commit all changes in the session-specific working directory to development branch (stateless)."""

        try:
            # Use the provided session path instead of the main project path
            repo = git.Repo(session_path)
            branch_name = f"{settings.session_branch_prefix}{session_id}"

            # Detect all changes BEFORE switching branches
            changed_files = self._detect_all_changes(repo)

            if not changed_files:
                logger.info(f"No changes detected in working directory for session {session_id}")
                return None

            # Now manage branch creation and switching (preserving changes)
            self._manage_chat_branch(repo, branch_name)

            # Add all changes to index (on the chat branch)
            self._add_all_changes(repo, changed_files)

            # Generate commit message and commit
            final_commit_message = self._generate_commit_message(commit_message, changed_files, session_id)
            commit = repo.index.commit(final_commit_message)

            # Push to remote
            self._push_to_remote(repo, branch_name)

            return self._create_github_commit_response(commit, repo, changed_files, session_path)

        except Exception as e:
            logger.error(f"Error committing changes for session {session_id}: {e}")
            raise Exception(f"Failed to commit changes: {e!s}") from e

    def _manage_chat_branch(self, repo: git.Repo, branch_name: str) -> None:
        """Create or switch to chat session branch"""
        try:
            # Check if branch exists locally
            if branch_name in [head.name for head in repo.heads]:
                # Branch exists, switch to it
                repo.heads[branch_name].checkout()
                logger.info(f"Switched to existing chat branch: {branch_name}")
            else:
                # Branch doesn't exist, create it from current state (don't switch to main)
                # This preserves any uncommitted changes that the agent made
                new_branch = repo.create_head(branch_name)
                new_branch.checkout()
                logger.info(f"Created new chat branch: {branch_name} from current state")
        except Exception as e:
            # Fallback to git commands if the above fails
            logger.warning(f"Using fallback git commands due to: {e}")
            try:
                repo.git.checkout(branch_name)
                logger.info(f"Switched to existing chat branch: {branch_name}")
            except git.exc.GitCommandError:
                # Branch doesn't exist, create it from current HEAD (preserving changes)
                repo.git.checkout("-b", branch_name)
                logger.info(f"Created new chat branch: {branch_name} from current state")

    def _detect_all_changes(self, repo: git.Repo) -> list[str]:
        """Detect all changes in the working directory using Git status"""
        try:
            # Get all modified, added, and untracked files
            changed_files = []

            # Modified files (already tracked)
            for item in repo.index.diff(None):
                changed_files.append(item.a_path)

            # Staged files (added to index)
            for item in repo.index.diff("HEAD"):
                if item.a_path not in changed_files:
                    changed_files.append(item.a_path)

            # Untracked files
            untracked = repo.untracked_files
            for file_path in untracked:
                # Skip common ignore patterns
                if not self._should_ignore_file(file_path):
                    changed_files.append(file_path)

            logger.info(f"Detected {len(changed_files)} changed files: {changed_files}")
            return changed_files

        except Exception as e:
            logger.error(f"Error detecting changes: {e}")
            return []

    def _should_ignore_file(self, file_path: str) -> bool:
        """Check if file should be ignored (common patterns)"""
        ignore_patterns = [
            ".git/",
            "__pycache__/",
            "node_modules/",
            ".next/",
            "dist/",
            "build/",
            ".env",
            ".env.local",
            ".DS_Store",
            "*.pyc",
            "*.log",
        ]
        return any(pattern in file_path for pattern in ignore_patterns)

    def _add_all_changes(self, repo: git.Repo, changed_files: list[str]) -> None:
        """Add all changed files to the git index"""
        try:
            if changed_files:
                # Add all files at once
                repo.index.add(changed_files)
                logger.info(f"Added {len(changed_files)} files to git index")
        except Exception as e:
            logger.error(f"Error adding files to index: {e}")
            raise

    def _generate_commit_message(self, commit_message: str | None, files_changed: list[str], session_id: str) -> str:
        """Generate meaningful commit message for versioning"""
        if commit_message:
            return commit_message

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if len(files_changed) <= 3:
            file_summary = ", ".join(files_changed)
            message = f"{settings.session_branch_prefix}{timestamp}: Modified {file_summary}"
        else:
            message = f"{settings.session_branch_prefix}{timestamp}: Modified {len(files_changed)} files"

        # Add session ID for traceability
        return f"{message} (chat: {session_id[:8]})"

    def _push_to_remote(self, repo: git.Repo, branch_name: str) -> None:
        """Push branch to remote repository using GitHub token"""
        try:
            origin = repo.remote(name="origin")

            # Get the original remote URL and modify it to include the token
            original_url = origin.url
            logger.info(f"Original remote URL: {original_url}")

            # Create authenticated URL with username:token format
            if original_url.startswith("https://github.com/"):
                # Convert to username:token authenticated URL
                authenticated_url = original_url.replace(
                    "https://github.com/", f"https://oauth2:{self.github_token}@github.com/"
                )
            elif original_url.startswith("git@github.com:"):
                # Convert SSH to HTTPS with username:token format
                repo_path = original_url.replace("git@github.com:", "").replace(".git", "")
                authenticated_url = f"https://oauth2:{self.github_token}@github.com/{repo_path}.git"
            else:
                authenticated_url = original_url
                logger.warning(f"Unexpected remote URL format: {original_url}")

            # Temporarily update the remote URL for pushing
            origin.set_url(authenticated_url)

            try:
                # Try to push the branch first
                try:
                    origin.push(branch_name)
                    logger.info(f"Pushed to chat branch: {branch_name}")
                except git.exc.GitCommandError:
                    # If branch doesn't exist on remote, push with upstream tracking
                    logger.info(f"Branch {branch_name} doesn't exist on remote, creating it...")
                    origin.push(f"{branch_name}:{branch_name}", set_upstream=True)
                    logger.info(f"Created and pushed new chat branch: {branch_name}")

            finally:
                # Restore the original remote URL (without token)
                origin.set_url(original_url)
                logger.debug("Restored original remote URL")

        except Exception as e:
            logger.error(f"Error pushing to remote: {e}")
            raise

    def _create_github_commit_response(
        self, commit: git.Commit, repo: git.Repo, files_changed: list[str], session_path: str
    ) -> GitHubCommit:
        """Create GitHubCommit response object"""
        origin = repo.remote(name="origin")
        remote_url = origin.url.replace(".git", f"/commit/{commit.hexsha}")

        return GitHubCommit(
            sha=commit.hexsha,
            message=commit.message,
            url=remote_url,
            files_changed=len(files_changed),
            timestamp=datetime.fromtimestamp(commit.committed_date),
        )

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
        Create a backup commit before reverting

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
