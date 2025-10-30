import logging
from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from app.services.docker_service import DockerService

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_docker_service() -> DockerService:
    return DockerService()


@router.get("/projects/{project_id}/preview-urls")
async def get_project_preview_urls(
    project_id: int, docker_service: Annotated[DockerService, Depends(get_docker_service)]
):
    """Get all preview URLs for a project"""
    try:
        return await docker_service.get_project_preview_urls(project_id)
    except Exception as e:
        logger.error(f"Error getting preview URLs for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get preview URLs: {e}") from e
