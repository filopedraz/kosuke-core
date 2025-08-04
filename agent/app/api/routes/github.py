import logging

from fastapi import APIRouter
from fastapi import Header
from fastapi import HTTPException

from app.models.github import CreateRepoRequest
from app.models.github import GitHubRepo
from app.models.github import ImportRepoRequest
from app.services.github_service import GitHubService

logger = logging.getLogger(__name__)
router = APIRouter()


def get_github_service(github_token: str) -> GitHubService:
    """Create GitHub service with token"""
    return GitHubService(github_token)


@router.post("/github/create-repo")
async def create_repository(
    request: CreateRepoRequest, github_token: str = Header(..., alias="X-GitHub-Token")
) -> GitHubRepo:
    """Create a new GitHub repository"""
    try:
        github_service = get_github_service(github_token)
        return await github_service.create_repository(request)
    except Exception as e:
        logger.error(f"Error creating repository: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/github/import-repo")
async def import_repository(request: ImportRepoRequest, github_token: str = Header(..., alias="X-GitHub-Token")):
    """Import a GitHub repository to a project"""
    try:
        github_service = get_github_service(github_token)
        project_path = await github_service.import_repository(request)
        return {"success": True, "project_id": request.project_id, "project_path": project_path}
    except Exception as e:
        logger.error(f"Error importing repository: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/github/start-session")
async def start_sync_session(project_id: int, session_id: str, github_token: str = Header(..., alias="X-GitHub-Token")):
    """Start a new sync session for tracking changes"""
    try:
        github_service = get_github_service(github_token)
        github_service.start_sync_session(project_id, session_id)
        return {"success": True, "session_id": session_id, "project_id": project_id}
    except Exception as e:
        logger.error(f"Error starting sync session: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/github/track-change")
async def track_file_change(session_id: str, file_path: str, github_token: str = Header(..., alias="X-GitHub-Token")):
    """Track a file change in the current sync session"""
    try:
        github_service = get_github_service(github_token)
        github_service.track_file_change(session_id, file_path)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking file change: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/github/commit-session")
async def commit_session_changes(
    session_id: str,
    commit_message: str | None = None,
    github_token: str = Header(..., alias="X-GitHub-Token"),
):
    """Commit all changes from a sync session"""
    try:
        github_service = get_github_service(github_token)
        commit = await github_service.commit_session_changes(session_id, commit_message)

        # End the session
        summary = github_service.end_sync_session(session_id)

        return {
            "success": True,
            "commit": commit.dict() if commit else None,
            "session_summary": summary,
        }
    except Exception as e:
        logger.error(f"Error committing session changes: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/github/repo-info")
async def get_repository_info(repo_url: str, github_token: str = Header(..., alias="X-GitHub-Token")) -> GitHubRepo:
    """Get information about a GitHub repository"""
    try:
        github_service = get_github_service(github_token)
        return await github_service.get_repository_info(repo_url)
    except Exception as e:
        logger.error(f"Error getting repository info: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/github/user-repos")
async def get_user_repositories(
    page: int = 1,
    per_page: int = 30,
    github_token: str = Header(..., alias="X-GitHub-Token"),
) -> list[GitHubRepo]:
    """Get user's GitHub repositories"""
    try:
        github_service = get_github_service(github_token)
        return github_service.get_user_repositories(page, per_page)
    except Exception as e:
        logger.error(f"Error getting user repositories: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/github/health")
async def github_health():
    """GitHub service health check"""
    return {"status": "healthy", "service": "github"}
