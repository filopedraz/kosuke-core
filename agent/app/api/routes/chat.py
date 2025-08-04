import json
import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.core.agent import Agent
from app.models.requests import ChatRequest
from app.models.responses import ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """
    Stream agent responses for real-time updates

    This endpoint provides Server-Sent Events streaming for the agentic workflow,
    mirroring the TypeScript streaming functionality.
    """

    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            logger.info(f"🚀 Starting chat stream for project {request.project_id}")
            logger.info(f"📝 Prompt: {request.prompt[:100]}{'...' if len(request.prompt) > 100 else ''}")

            # Create agent instance for this project
            agent = Agent(request.project_id, request.assistant_message_id)

            # Stream native Anthropic events directly with forced flushing
            async for event in agent.run(request.prompt):
                # Forward event as Server-Sent Event with immediate flush
                data = json.dumps(event, default=str)
                yield f"data: {data}\n\n"

        except Exception as e:
            print(f"❌ Error in chat stream: {e}")
            # Send error as final message
            error_data = {
                "type": "error",
                "message": f"Internal server error: {e!s}",
            }
            yield f"data: {json.dumps(error_data)}\n\n"

        # Send end marker
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_simple(request: ChatRequest):
    """
    Simple non-streaming endpoint for testing and debugging

    This endpoint collects all updates and returns them as a single response.
    Useful for testing the agent workflow without streaming complexity.
    """
    try:
        print(f"🚀 Starting simple chat for project {request.project_id}")
        print(f"📝 Prompt: {request.prompt[:100]}{'...' if len(request.prompt) > 100 else ''}")

        # Create agent instance for this project
        agent = Agent(request.project_id)

        # Collect all updates
        updates = []
        async for update in agent.run(request.prompt):
            updates.append(update)

            # Safety limit to prevent memory issues
            if len(updates) > 1000:
                print("⚠️ Update limit reached, stopping collection")
                break

        print(f"✅ Collected {len(updates)} updates")

        return ChatResponse(updates=updates, success=True)

    except Exception as e:
        print(f"❌ Error in simple chat: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify the API is working"""
    return {
        "message": "Chat API is working!",
        "service": "agentic-coding-pipeline",
        "endpoints": {"streaming": "/api/chat/stream", "simple": "/api/chat", "test": "/api/test"},
    }
