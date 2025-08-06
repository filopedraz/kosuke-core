from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from typing import Optional

from app.services.session_manager import SessionManager
from app.services.git_service import GitService

logger = logging.getLogger(__name__)
router = APIRouter()

class RevertRequest(BaseModel):
    project_id: int
    session_id: str
    commit_sha: str
    create_backup: bool = False

class RevertResponse(BaseModel):
    success: bool
    reverted_to_commit: str
    backup_commit: Optional[str] = None
    message: str

@router.post("/revert", response_model=RevertResponse)
async def revert_to_commit(request: RevertRequest):
    """
    Revert session to specific commit SHA
    """
    try:
        logger.info(f"Reverting project {request.project_id} session {request.session_id} to commit {request.commit_sha}")

        session_manager = SessionManager()
        git_service = GitService()

        # Get session path
        session_path = session_manager.get_session_path(request.project_id, request.session_id)
        if not session_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Session environment not found for {request.session_id}"
            )

        # Create backup commit if requested
        backup_commit = None
        if request.create_backup:
            backup_commit = git_service.create_backup_commit(
                session_path,
                f"Backup before reverting to {request.commit_sha[:7]}"
            )

        # Perform git revert operation
        success = git_service.checkout_commit(
            session_path,
            request.commit_sha
        )

        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to revert to commit {request.commit_sha}"
            )

        logger.info(f"✅ Successfully reverted to commit {request.commit_sha}")

        return RevertResponse(
            success=True,
            reverted_to_commit=request.commit_sha,
            backup_commit=backup_commit,
            message=f"Reverted to commit {request.commit_sha[:7]}"
        )

    except Exception as e:
        logger.error(f"❌ Error reverting to commit: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to revert: {str(e)}"
        )