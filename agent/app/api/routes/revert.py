import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from fastapi import Header
from fastapi import HTTPException

from app.models.revert import RevertRequest
from app.models.revert import RevertResponse
from app.utils.providers import get_github_service
from app.utils.providers import get_session_manager
from app.utils.providers import get_webhook_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/revert", response_model=RevertResponse)
async def revert_to_commit(request: RevertRequest, github_token: str = Header(..., alias="X-GitHub-Token")):
    """
    Revert session to specific commit SHA
    """
    try:
        logger.info(
            f"Reverting project {request.project_id} session {request.session_id} to commit {request.commit_sha}"
        )

        session_manager = get_session_manager()
        # For local Git operations, token is still required to ensure consistent auth context
        git_service = get_github_service(github_token)

        # Get session path
        session_path_str = session_manager.get_session_path(request.project_id, request.session_id)
        session_path = Path(session_path_str)
        if not session_path.exists():
            raise HTTPException(status_code=404, detail=f"Session environment not found for {request.session_id}")

        # Create backup commit if requested
        backup_commit = None
        if request.create_backup:
            backup_commit = git_service.create_backup_commit(
                session_path, f"Backup before reverting to {request.commit_sha[:7]}"
            )

        # Perform git revert operation
        success = git_service.checkout_commit(session_path, request.commit_sha)

        if not success:
            raise HTTPException(status_code=400, detail=f"Failed to revert to commit {request.commit_sha}")

        logger.info(f"✅ Successfully reverted to commit {request.commit_sha}")

        # Send system message to chat about the revert
        try:
            # Use webhook service via provider with async context manager
            async with get_webhook_service() as webhook:
                await webhook.send_system_message(
                    project_id=request.project_id,
                    chat_session_id=request.session_id,  # Pass the string session ID
                    content="Project restored to the state when this assistant message was created",
                    revert_info={
                        "commit_sha": request.commit_sha,
                        "reverted_at": datetime.now().isoformat(),
                        "message_id": request.message_id,
                    },
                )
            logger.info(f"✅ Sent revert system message for session {request.session_id}")
        except Exception as webhook_error:
            logger.warning(f"Failed to send revert system message: {webhook_error}")
            # Don't fail the revert operation if webhook fails

        return RevertResponse(
            success=True,
            reverted_to_commit=request.commit_sha,
            backup_commit=backup_commit,
            message=f"Reverted to commit {request.commit_sha[:7]}",
        )

    except Exception as e:
        logger.error(f"❌ Error reverting to commit: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to revert: {e!s}") from e
