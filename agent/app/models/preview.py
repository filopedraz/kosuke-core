from pydantic import BaseModel
from typing import Optional, Dict

class ContainerInfo(BaseModel):
    project_id: int
    container_id: str
    container_name: str
    port: int
    url: str
    compilation_complete: bool = False
    is_responding: bool = False

class PreviewStatus(BaseModel):
    running: bool
    url: Optional[str] = None
    compilation_complete: bool
    is_responding: bool

class StartPreviewRequest(BaseModel):
    project_id: int
    env_vars: Dict[str, str] = {}

class StopPreviewRequest(BaseModel):
    project_id: int