"""
Chat Sessions API - Handles session-aware chat requests
"""
import json
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.core.agent import Agent
from app.models.requests import ChatSessionRequest
from app.services.session_manager import SessionManager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat/session")
async def chat_with_session(request: ChatSessionRequest):
    """
    Process chat request with session isolation

    Each session gets its own isolated working directory and Agent instance
    """
    try:
        logger.info(
            f"🤖 Processing session chat request for project {request.project_id}, session {request.session_id}"
        )

        # Initialize session manager
        session_manager = SessionManager()

        # Ensure session environment exists or create it
        project_path = None
        try:
            # Check if session environment already exists
            if not session_manager.validate_session_directory(request.project_id, request.session_id):
                logger.info(f"📁 Creating session environment for {request.session_id}")
                project_path = session_manager.create_session_environment(
                    project_id=request.project_id,
                    session_id=request.session_id,
                    base_branch="main",  # TODO: Get from project settings
                )
            else:
                project_path = session_manager.get_session_path(request.project_id, request.session_id)
                logger.info(f"📁 Using existing session environment: {project_path}")
        except Exception as session_error:
            logger.error(f"❌ Failed to setup session environment: {session_error}")
            detail_msg = f"Failed to setup session environment: {session_error}"
            raise HTTPException(status_code=500, detail=detail_msg) from session_error

        # Initialize Agent with session-specific parameters
        try:
            agent = Agent(
                project_id=request.project_id,
                session_id=request.session_id,
                assistant_message_id=request.assistant_message_id,
            )

            # Set GitHub integration if token provided
            if request.github_token:
                agent.set_github_integration(request.github_token)

        except Exception as agent_error:
            logger.error(f"❌ Failed to initialize Agent: {agent_error}")
            raise HTTPException(status_code=500, detail=f"Failed to initialize Agent: {agent_error}") from agent_error

        # Stream the agent response
        async def stream_response() -> AsyncGenerator[str, None]:
            try:
                async for chunk in agent.run(request.prompt):
                    # Format as Server-Sent Events with proper JSON serialization
                    data = json.dumps(chunk, default=str)
                    yield f"data: {data}\n\n"

                # Send completion marker
                yield "data: [DONE]\n\n"

            except Exception as stream_error:
                logger.error(f"❌ Error in stream processing: {stream_error}")
                error_data = {"type": "error", "message": f"Stream processing error: {stream_error}"}
                yield f"data: {json.dumps(error_data)}\n\n"

        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
            },
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in session chat: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}") from e


@router.post("/chat/session/{session_id}/cleanup")
async def cleanup_session(session_id: str, project_id: int):
    """
    Clean up session environment (optional endpoint for manual cleanup)
    """
    try:
        session_manager = SessionManager()
        success = session_manager.cleanup_session_environment(project_id, session_id)

        if success:
            return {"success": True, "message": f"Session {session_id} cleaned up successfully"}
        return {"success": False, "message": f"Failed to cleanup session {session_id}"}

    except Exception as e:
        logger.error(f"❌ Error cleaning up session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup session: {e}") from e
