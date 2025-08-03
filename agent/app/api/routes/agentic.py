"""
Claude Code API routes for repository analysis and file modification
"""
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.claude_code_agent import ClaudeCodeAgent
from app.models.requests import ChatRequest
from app.models.responses import ChatResponse


router = APIRouter()


@router.post("/claude-code/stream")
async def claude_code_stream(request: ChatRequest) -> StreamingResponse:
    """
    Stream claude-code responses for repository analysis and file modification
    
    This endpoint provides Server-Sent Events streaming using claude-code-sdk
    for intelligent repository analysis and file modifications.
    
    Tool execution (Read, Write, Bash, Grep) is handled automatically by claude-code-sdk.
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            print(f"🚀 Starting claude-code stream for project {request.project_id}")
            print(f"📝 Prompt: {request.prompt[:100]}{'...' if len(request.prompt) > 100 else ''}")
            
            # Create claude-code agent instance
            agent = ClaudeCodeAgent(request.project_id, request.assistant_message_id)
            
            # Stream claude-code events with same interface as existing chat
            async for event in agent.run(request.prompt):
                # Forward event as Server-Sent Event
                data = json.dumps(event, default=str)
                yield f"data: {data}\n\n"
                
        except Exception as e:
            print(f"❌ Error in claude-code stream: {e}")
            # Send error as final message
            error_data = {
                "type": "error", 
                "message": f"Claude-code error: {e!s}",
                "error_type": "claude_code_error"
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


@router.post("/claude-code", response_model=ChatResponse)
async def claude_code_simple(request: ChatRequest):
    """
    Simple non-streaming endpoint for claude-code analysis
    
    This endpoint collects all updates and returns them as a single response.
    Useful for testing the claude-code workflow without streaming complexity.
    """
    try:
        print(f"🚀 Starting simple claude-code for project {request.project_id}")
        print(f"📝 Prompt: {request.prompt[:100]}{'...' if len(request.prompt) > 100 else ''}")
        
        # Create claude-code agent instance
        agent = ClaudeCodeAgent(request.project_id, request.assistant_message_id)
        
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
        print(f"❌ Error in simple claude-code: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/claude-code/test")
async def test_claude_code_endpoint():
    """Test endpoint to verify the claude-code API is working"""
    return {
        "message": "Claude Code API is working!",
        "service": "claude-code-repository-agent",
        "capabilities": [
            "Repository analysis and understanding",
            "Intelligent file modification", 
            "Tool-aware execution (Read, Write, Bash, Grep)",
            "Automatic tool execution by claude-code-sdk",
            "Kosuke template project structure"
        ],
        "endpoints": {
            "streaming": "/api/claude-code/stream",
            "simple": "/api/claude-code",
            "test": "/api/claude-code/test"
        },
        "note": "Tool execution (Read, Write, Bash, Grep) is handled automatically by claude-code-sdk"
    }