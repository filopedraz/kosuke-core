from pydantic import BaseModel


class ContainerInfo(BaseModel):
    project_id: int
    session_id: str
    container_id: str
    container_name: str
    port: int
    url: str
    compilation_complete: bool = False
    is_responding: bool = False


class PreviewStatus(BaseModel):
    running: bool
    url: str | None = None
    compilation_complete: bool
    is_responding: bool


class StartPreviewRequest(BaseModel):
    project_id: int
    session_id: str | None = None  # Optional for main branch
    env_vars: dict[str, str] = {}


class StopPreviewRequest(BaseModel):
    project_id: int
    session_id: str | None = None  # Optional for main branch
