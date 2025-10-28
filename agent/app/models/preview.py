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


class PreviewStatus(BaseModel):
    running: bool
    url: str | None = None
    is_responding: bool


class StartPreviewRequest(BaseModel):
    project_id: int
    session_id: str
    env_vars: dict[str, str] = {}


class PullResult(BaseModel):
    changed: bool
    commits_pulled: int
    message: str
    previous_commit: str | None = None
    new_commit: str | None = None
    branch_name: str | None = None


class PullRequest(BaseModel):
    project_id: int
    session_id: str
    force: bool = False  # Force pull (ignore cache)


class PullResponse(BaseModel):
    success: bool
    pull_request: PullResult
    container_restarted: bool = False
