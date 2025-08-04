import logging

from fastapi import APIRouter
from fastapi import Header
from fastapi import HTTPException

from app.models.github import CommitChangesRequest
from app.models.github import CreateRepoRequest
from app.models.github import GitHubRepo
from app.models.github import ImportRepoRequest
from app.services.github_service import GitHubService

logger = logging.getLogger(__name__)
router = APIRouter()


def get_github_service(authorization: str = Header(None)) -> GitHubService:
    """Create GitHub service instance from authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub token required in Authorization header")

    token = authorization.replace("Bearer ", "")
    return GitHubService(token)


@router.post("/github/repositories", response_model=GitHubRepo)
async def create_repository(request: CreateRepoRequest, authorization: str = Header(None)):
    """Create a new GitHub repository"""
    try:
        github_service = get_github_service(authorization)
        repo = await github_service.create_repository(request)
        logger.info(f"Created repository: {repo.owner}/{repo.name}")
        return repo
    except Exception as e:
        logger.error(f"Failed to create repository: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/github/import")
async def import_repository(request: ImportRepoRequest, authorization: str = Header(None)):
    """Import/clone a GitHub repository to local project"""
    try:
        github_service = get_github_service(authorization)
        project_path = await github_service.import_repository(request)
        logger.info(f"Imported repository to: {project_path}")
        return {"project_path": project_path, "project_id": request.project_id}
    except Exception as e:
        logger.error(f"Failed to import repository: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/github/repositories", response_model=list[GitHubRepo])
async def get_user_repositories(page: int = 1, per_page: int = 30, authorization: str = Header(None)):
    """Get user's GitHub repositories"""
    try:
        github_service = get_github_service(authorization)
        repos = github_service.get_user_repositories(page, per_page)
        logger.info(f"Retrieved {len(repos)} repositories for user")
        return repos
    except Exception as e:
        logger.error(f"Failed to get repositories: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/github/repositories/info", response_model=GitHubRepo)
async def get_repository_info(repo_url: str, authorization: str = Header(None)):
    """Get information about a GitHub repository"""
    try:
        github_service = get_github_service(authorization)
        repo_info = await github_service.get_repository_info(repo_url)
        logger.info(f"Retrieved info for repository: {repo_info.owner}/{repo_info.name}")
        return repo_info
    except Exception as e:
        logger.error(f"Failed to get repository info: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/github/sync/start")
async def start_sync_session(project_id: int, session_id: str, authorization: str = Header(None)):
    """Start a new sync session for tracking changes"""
    try:
        github_service = get_github_service(authorization)
        github_service.start_sync_session(project_id, session_id)
        logger.info(f"Started sync session {session_id} for project {project_id}")
        return {"session_id": session_id, "project_id": project_id, "status": "started"}
    except Exception as e:
        logger.error(f"Failed to start sync session: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/github/sync/track")
async def track_file_change(session_id: str, file_path: str, authorization: str = Header(None)):
    """Track a file change in the current sync session"""
    try:
        github_service = get_github_service(authorization)
        github_service.track_file_change(session_id, file_path)
        logger.info(f"Tracked file change: {file_path} in session {session_id}")
        return {"session_id": session_id, "file_path": file_path, "status": "tracked"}
    except Exception as e:
        logger.error(f"Failed to track file change: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/github/sync/commit")
async def commit_session_changes(request: CommitChangesRequest, authorization: str = Header(None)):
    """Commit all changes from a sync session"""
    try:
        github_service = get_github_service(authorization)
        commit = await github_service.commit_session_changes(request.session_id, request.message)

        if commit:
            logger.info(f"Committed changes for session {request.session_id}: {commit.sha}")
            return {"session_id": request.session_id, "commit": commit, "status": "committed"}

        logger.info(f"No changes to commit for session {request.session_id}")
        return {"session_id": request.session_id, "status": "no_changes"}
    except Exception as e:
        logger.error(f"Failed to commit session changes: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/github/sync/end")
async def end_sync_session(session_id: str, authorization: str = Header(None)):
    """End a sync session and return summary"""
    try:
        github_service = get_github_service(authorization)
        summary = github_service.end_sync_session(session_id)
        logger.info(f"Ended sync session {session_id}")
        return summary
    except Exception as e:
        logger.error(f"Failed to end sync session: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e
