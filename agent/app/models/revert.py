from pydantic import BaseModel


class RevertRequest(BaseModel):
    """Request payload to revert a session to a specific commit."""

    project_id: int
    session_id: str
    commit_sha: str
    message_id: int
    create_backup: bool = False


class RevertResponse(BaseModel):
    """Response payload after performing a revert operation."""

    success: bool
    reverted_to_commit: str
    backup_commit: str | None = None
    message: str
