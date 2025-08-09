import logging
from typing import Annotated

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from app.models.preview import PreviewStatus
from app.models.preview import PullRequest
from app.models.preview import PullResponse
from app.models.preview import PullResult
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

        # Get the full status
        status = await docker_service.get_preview_status(request.project_id, session_id)

        return {
            "success": True,
            "url": url,
            "project_id": request.project_id,
            "session_id": session_id,
            "running": status.running,
            "is_responding": status.is_responding,
        }
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


@router.post("/preview/pull")
async def pull_project(
    request: PullRequest, docker_service: Annotated[DockerService, Depends(get_docker_service)]
) -> PullResponse:
    """Pull latest changes for a project or session"""
    try:
        # Use "main" as default session_id for main branch pulls
        session_id = request.session_id or "main"

        git_status = await docker_service.pull_branch(request.project_id, session_id, force=request.force)

        # Check if we need to restart the container to apply changes
        container_restarted = False
        if git_status.get("success") and git_status.get("commits_pulled", 0) > 0:
            # Restart container if it's running and there were changes
            container_running = await docker_service.is_container_running(request.project_id, session_id)
            if container_running:
                await docker_service.restart_preview_container(request.project_id, session_id)
                container_restarted = True

        pull_result = PullResult(
            changed=bool(git_status.get("commits_pulled", 0) > 0),
            commits_pulled=int(git_status.get("commits_pulled", 0)),
            message=str(git_status.get("message", "")),
            previous_commit=git_status.get("previous_commit"),
            new_commit=git_status.get("new_commit"),
            branch_name=git_status.get("branch_name"),
        )

        return PullResponse(
            success=git_status.get("success", False), pullResult=pull_result, container_restarted=container_restarted
        )
    except Exception as e:
        session_id = request.session_id or "main"
        logger.error(f"Error pulling project {request.project_id} session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to pull: {e!s}") from e


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


@router.get("/preview/health")
async def preview_health(docker_service: Annotated[DockerService, Depends(get_docker_service)]):
    """Check preview service health"""
    docker_available = await docker_service.is_docker_available()
    return {"status": "healthy" if docker_available else "unhealthy", "docker_available": docker_available}
