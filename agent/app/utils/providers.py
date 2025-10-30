from app.services.color_palette_service import ColorPaletteService
from app.services.database_service import DatabaseService
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


def get_session_manager() -> SessionManager:
    return SessionManager()


def get_database_service(project_id: int, session_id: str | None = None) -> DatabaseService:
    return DatabaseService(project_id=project_id, session_id=session_id)


def get_github_service(github_token: str) -> GitHubService:
    return GitHubService(github_token=github_token)
