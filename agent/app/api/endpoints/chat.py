from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
from typing import AsyncGenerator
from app.models.requests import ChatRequest
from app.models.responses import ChatResponse
from app.core.agent import Agent

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
            print(f"🚀 Starting chat stream for project {request.project_id}")
            print(f"📝 Prompt: {request.prompt[:100]}{'...' if len(request.prompt) > 100 else ''}")
            
            # Create agent instance for this project
            agent = Agent(request.project_id)
            
            # Stream updates from the agent
            async for update in agent.run(request.prompt):
                # Format as Server-Sent Events
                data = json.dumps(update, default=str)  # default=str handles any enum values
                yield f"data: {data}\n\n"
                
        except Exception as e:
            print(f"❌ Error in chat stream: {e}")
            # Send error as final message
            error_data = {
                "type": "error",
                "file_path": "",
                "message": f"Internal server error: {str(e)}",
                "status": "error",
                "error_type": "unknown"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        
        # Send end marker
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
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
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify the API is working"""
    return {
        "message": "Chat API is working!",
        "service": "agentic-coding-pipeline",
        "endpoints": {
            "streaming": "/api/chat/stream",
            "simple": "/api/chat",
            "test": "/api/test"
        }
    } 