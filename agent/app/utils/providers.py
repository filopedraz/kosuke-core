from app.services.database_service import DatabaseService
from app.services.fs_service import FileSystemService


def get_fs_service() -> FileSystemService:
    return FileSystemService()


def get_database_service(project_id: int, session_id: str | None = None) -> DatabaseService:
    return DatabaseService(project_id=project_id, session_id=session_id)
