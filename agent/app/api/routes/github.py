import logging

from fastapi import APIRouter
from fastapi import Header
from fastapi import HTTPException

from app.models.github import CloneRepoRequest
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


@router.post("/github/clone-repo")
async def clone_repository(request: CloneRepoRequest, github_token: str = Header(..., alias="X-GitHub-Token")):
    """Clone a GitHub repository to local project directory"""
    try:
        github_service = get_github_service(github_token)
        project_path = await github_service.clone_repository(request)
        return {"success": True, "project_id": request.project_id, "project_path": project_path}
    except Exception as e:
        logger.error(f"Error cloning repository: {e}")
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


@router.get("/github/template-status")
async def check_template_status(github_token: str = Header(..., alias="X-GitHub-Token")):
    """Check if the Kosuke template repository is accessible and properly configured"""
    try:
        from app.utils.config import settings

        github_service = get_github_service(github_token)
        template_repo = settings.template_repository

        # Try to access the template repository
        github_client = github_service.github
        template = github_client.get_repo(template_repo)

        # Get user info
        user = github_client.get_user()
        return {
            "template_repository": template_repo,
            "template_exists": True,
            "template_is_template": template.is_template,
            "template_name": template.full_name,
            "template_description": template.description,
            "template_private": template.private,
            "user_login": user.login,
            "user_id": user.id,
            "status": "accessible" if template.is_template else "not_a_template",
        }
    except Exception as e:
        logger.error(f"Error checking template status: {e}")
        return {
            "template_repository": getattr(settings, "template_repository", "unknown"),
            "template_exists": False,
            "error": str(e),
            "status": "error",
        }


@router.get("/github/health")
async def github_health():
    """GitHub service health check"""
    return {"status": "healthy", "service": "github"}
