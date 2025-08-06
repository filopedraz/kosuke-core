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
    compilation_complete: bool = False
    is_responding: bool = False
    git_status: GitUpdateStatus | None = None


class PreviewStatus(BaseModel):
    running: bool
    url: str | None = None
    compilation_complete: bool
    is_responding: bool
    git_status: GitUpdateStatus | None = None


class StartPreviewRequest(BaseModel):
    project_id: int
    session_id: str | None = None  # Optional for main branch
    env_vars: dict[str, str] = {}


class StopPreviewRequest(BaseModel):
    project_id: int
    session_id: str | None = None  # Optional for main branch
