from pydantic import BaseModel


class GitUpdateStatus(BaseModel):
    success: bool
    action: str  # "cached", "pulled", "error"
    message: str
    commits_pulled: int
    last_pull_time: str | None = None
    previous_commit: str | None = None
    new_commit: str | None = None
    error: str | None = None


class ContainerInfo(BaseModel):
    project_id: int
    session_id: str
    container_id: str
    container_name: str
    port: int
    url: str


class StartPreviewRequest(BaseModel):
    project_id: int
    session_id: str
    env_vars: dict[str, str] = {}
