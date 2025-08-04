from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class GitHubRepo(BaseModel):
    name: str
    owner: str
    url: str
    private: bool = True
    description: Optional[str] = None

class GitHubCommit(BaseModel):
    sha: str
    message: str
    url: str
    files_changed: int
    timestamp: datetime

class CreateRepoRequest(BaseModel):
    name: str
    description: Optional[str] = None
    private: bool = True
    template_repo: Optional[str] = None

class ImportRepoRequest(BaseModel):
    repo_url: str
    project_id: int

class CommitChangesRequest(BaseModel):
    project_id: int
    session_id: str
    message: Optional[str] = None
    files: List[str] = []

class SyncSessionInfo(BaseModel):
    session_id: str
    project_id: int
    files_changed: List[str] = []
    start_time: datetime
    status: str = "active"