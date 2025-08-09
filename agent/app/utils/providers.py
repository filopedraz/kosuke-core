from app.services.claude_code_service import ClaudeCodeService
from app.services.color_palette_service import ColorPaletteService
from app.services.database_service import DatabaseService
from app.services.docker_service import DockerService
from app.services.domain_service import DomainService
from app.services.fs_service import FileSystemService
from app.services.github_service import GitHubService
from app.services.session_manager import SessionManager
from app.services.webhook_service import WebhookService


def get_fs_service() -> FileSystemService:
    return FileSystemService()


def get_color_palette_service() -> ColorPaletteService:
    return ColorPaletteService()


def get_webhook_service() -> WebhookService:
    return WebhookService()


def get_docker_service() -> DockerService:
    return DockerService()


def get_domain_service() -> DomainService:
    return DomainService()


def get_session_manager() -> SessionManager:
    return SessionManager()


def get_database_service(project_id: int, session_id: str | None = None) -> DatabaseService:
    return DatabaseService(project_id=project_id, session_id=session_id)


def get_github_service(github_token: str, *, local_only: bool = False) -> GitHubService:
    return GitHubService(github_token=github_token, local_only=local_only)


def get_claude_code_service(project_id: int, *, working_directory: str | None = None) -> ClaudeCodeService:
    return ClaudeCodeService(project_id=project_id, working_directory=working_directory)
