import logging

from fastapi import APIRouter
from fastapi import Header
from fastapi import HTTPException

from app.models.github import CreateRepoRequest
from app.models.github import GitHubRepo
from app.models.github import ImportRepoRequest
from app.utils.providers import get_github_service

logger = logging.getLogger(__name__)
router = APIRouter()


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
