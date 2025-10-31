from app.services.database_service import DatabaseService


def get_database_service(project_id: int, session_id: str | None = None) -> DatabaseService:
    return DatabaseService(project_id=project_id, session_id=session_id)
