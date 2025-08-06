import logging
from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from app.models.preview import PreviewStatus
from app.models.preview import StartPreviewRequest
from app.models.preview import StopPreviewRequest
from app.services.docker_service import DockerService

logger = logging.getLogger(__name__)
router = APIRouter()


# Dependency to get Docker service
async def get_docker_service() -> DockerService:
    return DockerService()


@router.post("/preview/start")
async def start_preview(
    request: StartPreviewRequest, docker_service: Annotated[DockerService, Depends(get_docker_service)]
):
    """Start a preview for a project session"""
    try:
        if not await docker_service.is_docker_available():
            raise HTTPException(status_code=503, detail="Docker is not available")

        # Use "main" as default session_id for main branch previews
        session_id = request.session_id or "main"
        url = await docker_service.start_preview(request.project_id, session_id, request.env_vars)

        # Get the full status including git information
        status = await docker_service.get_preview_status(request.project_id, session_id)

        response = {
            "success": True,
            "url": url,
            "project_id": request.project_id,
            "session_id": session_id,
            "compilation_complete": status.compilation_complete,
            "is_responding": status.is_responding
        }

        # Include git status for main branch previews
        if status.git_status:
            response["git_status"] = {
                "success": status.git_status.success,
                "action": status.git_status.action,
                "message": status.git_status.message,
                "commits_pulled": status.git_status.commits_pulled
            }

        return response
    except HTTPException:
        raise  # Re-raise HTTPExceptions without modification
    except Exception as e:
        session_id = request.session_id or "main"
        logger.error(f"Error starting preview for project {request.project_id} session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start preview: {e!s}") from e


@router.post("/preview/stop")
async def stop_preview(
    request: StopPreviewRequest, docker_service: Annotated[DockerService, Depends(get_docker_service)]
):
    """Stop a preview for a project session"""
    try:
        # Use "main" as default session_id for main branch previews
        session_id = request.session_id or "main"
        await docker_service.stop_preview(request.project_id, session_id)
        return {"success": True, "project_id": request.project_id, "session_id": session_id}
    except Exception as e:
        session_id = request.session_id or "main"
        logger.error(f"Error stopping preview for project {request.project_id} session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop preview: {e!s}") from e


@router.get("/preview/status/{project_id}/{session_id}")
async def get_preview_status_with_session(
    project_id: int, session_id: str, docker_service: Annotated[DockerService, Depends(get_docker_service)]
) -> PreviewStatus:
    """Get preview status for a project session"""

    try:
        return await docker_service.get_preview_status(project_id, session_id)
    except Exception as e:
        logger.error(f"Error getting preview status for project {project_id} session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get preview status: {e!s}") from e


@router.get("/preview/status/{project_id}")
async def get_preview_status_main_branch(
    project_id: int, docker_service: Annotated[DockerService, Depends(get_docker_service)]
) -> PreviewStatus:
    """Get preview status for a project main branch (no session)"""

    try:
        # Use "main" as default session_id for main branch previews
        return await docker_service.get_preview_status(project_id, "main")
    except Exception as e:
        logger.error(f"Error getting preview status for project {project_id} main branch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get preview status: {e!s}") from e


@router.post("/preview/stop-all")
async def stop_all_previews(docker_service: Annotated[DockerService, Depends(get_docker_service)]):
    """Stop all preview containers"""
    try:
        await docker_service.stop_all_previews()
        return {"success": True, "message": "All previews stopped"}
    except Exception as e:
        logger.error(f"Error stopping all previews: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop all previews: {e!s}") from e


@router.get("/preview/health")
async def preview_health(docker_service: Annotated[DockerService, Depends(get_docker_service)]):
    """Check preview service health"""
    docker_available = await docker_service.is_docker_available()
    return {"status": "healthy" if docker_available else "unhealthy", "docker_available": docker_available}
