from datetime import datetime

from pydantic import BaseModel


class GitHubRepo(BaseModel):
    name: str
    owner: str
    url: str
    private: bool = True
    description: str | None = None


class GitHubCommit(BaseModel):
    sha: str
    message: str
    url: str
    files_changed: int
    timestamp: datetime


class CreateRepoRequest(BaseModel):
    name: str
    description: str | None = None
    private: bool = True
    template_repo: str | None = None
    project_id: int | None = None


class ImportRepoRequest(BaseModel):
    repo_url: str
    project_id: int


class CloneRepoRequest(BaseModel):
    repo_url: str
    project_id: int


class CommitChangesRequest(BaseModel):
    project_id: int
    session_id: str
    message: str | None = None
    files: list[str] = []


class SyncSessionInfo(BaseModel):
    session_id: str
    project_id: int
    files_changed: list[str] = []
    start_time: datetime
    status: str = "active"
