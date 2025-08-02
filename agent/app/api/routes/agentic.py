"""
Agentic API routes using claude-code-sdk for advanced agent workflows
"""
import json
from collections.abc import AsyncGenerator
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.claude_code_agent import ClaudeCodeAgent
from app.models.requests import ChatRequest


router = APIRouter()


class AgenticChatRequest(BaseModel):
    """Extended chat request for agentic workflows"""
    project_id: int
    prompt: str
    agent_type: Optional[str] = None  # Specific agent to use
    max_turns: int = 5  # Maximum conversation turns
    assistant_message_id: Optional[int] = None


class CreateAgentRequest(BaseModel):
    """Request to create a custom agent"""
    project_id: int
    agent_type: str
    description: str
    system_prompt: str
    allowed_tools: Optional[List[str]] = None
    when_to_use: Optional[str] = None


class AgentListRequest(BaseModel):
    """Request to list available agents"""
    project_id: int


@router.post("/agentic/chat/stream")
async def agentic_chat_stream(request: AgenticChatRequest) -> StreamingResponse:
    """
    Stream agentic responses using claude-code-sdk
    
    This endpoint provides Server-Sent Events streaming for advanced agentic workflows
    with multi-agent collaboration, tool use, and intelligent task routing.
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            print(f"🚀 Starting agentic chat stream for project {request.project_id}")
            print(f"📝 Prompt: {request.prompt[:100]}{'...' if len(request.prompt) > 100 else ''}")
            if request.agent_type:
                print(f"🤖 Using specific agent: {request.agent_type}")
            
            # Create claude-code agent instance
            agent = ClaudeCodeAgent(request.project_id, request.assistant_message_id)
            
            # Stream agentic events
            async for event in agent.run(
                prompt=request.prompt,
                agent_type=request.agent_type,
                max_turns=request.max_turns
            ):
                # Forward event as Server-Sent Event
                data = json.dumps(event, default=str)
                yield f"data: {data}\n\n"
                
        except Exception as e:
            print(f"❌ Error in agentic chat stream: {e}")
            # Send error as final message
            error_data = {
                "type": "error", 
                "message": f"Agentic pipeline error: {e!s}",
                "error_type": "agentic_pipeline_error"
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


@router.post("/agentic/agents/list")
async def list_agents(request: AgentListRequest) -> StreamingResponse:
    """
    List available agents for a project
    
    Returns information about all available agents including their capabilities,
    allowed tools, and when they should be used.
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            print(f"📋 Listing agents for project {request.project_id}")
            
            # Create claude-code agent instance
            agent = ClaudeCodeAgent(request.project_id)
            
            # Stream agent list
            async for event in agent.list_agents():
                data = json.dumps(event, default=str)
                yield f"data: {data}\n\n"
                
        except Exception as e:
            print(f"❌ Error listing agents: {e}")
            error_data = {
                "type": "error",
                "message": f"Error listing agents: {e!s}"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        
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
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agentic/agents/create")
async def create_agent(request: CreateAgentRequest) -> StreamingResponse:
    """
    Create a custom agent for a project
    
    Creates a new agent with specified capabilities, tools, and system prompt.
    The agent will be saved as a markdown file in the project's .claude/agents directory.
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            print(f"🔧 Creating agent '{request.agent_type}' for project {request.project_id}")
            
            # Create claude-code agent instance
            agent = ClaudeCodeAgent(request.project_id)
            
            # Stream agent creation
            async for event in agent.create_custom_agent(
                agent_type=request.agent_type,
                description=request.description,
                system_prompt=request.system_prompt,
                allowed_tools=request.allowed_tools,
                when_to_use=request.when_to_use
            ):
                data = json.dumps(event, default=str)
                yield f"data: {data}\n\n"
                
        except Exception as e:
            print(f"❌ Error creating agent: {e}")
            error_data = {
                "type": "error",
                "message": f"Error creating agent: {e!s}"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        
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
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agentic/code-analysis")
async def code_analysis_stream(request: ChatRequest) -> StreamingResponse:
    """
    Specialized endpoint for code analysis using the code-analyzer agent
    
    This endpoint automatically routes requests to the code-analyzer agent
    for code review, quality assessment, and architectural analysis.
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            print(f"🔍 Starting code analysis for project {request.project_id}")
            
            # Create claude-code agent with code-analyzer
            agent = ClaudeCodeAgent(request.project_id, request.assistant_message_id)
            
            # Enhanced prompt for code analysis
            analysis_prompt = f"""
Perform a comprehensive code analysis of the following request:

{request.prompt}

Please provide:
1. Code structure and architecture analysis
2. Quality assessment and potential improvements
3. Security considerations
4. Performance optimization opportunities
5. Best practices recommendations

Use your code analysis tools to examine the codebase thoroughly.
"""
            
            # Stream code analysis
            async for event in agent.run(
                prompt=analysis_prompt,
                agent_type="code-analyzer",
                max_turns=3
            ):
                data = json.dumps(event, default=str)
                yield f"data: {data}\n\n"
                
        except Exception as e:
            print(f"❌ Error in code analysis: {e}")
            error_data = {
                "type": "error",
                "message": f"Code analysis error: {e!s}"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        
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
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agentic/dev-assistant") 
async def dev_assistant_stream(request: ChatRequest) -> StreamingResponse:
    """
    Specialized endpoint for development assistance using the dev-assistant agent
    
    This endpoint automatically routes requests to the dev-assistant agent
    for code generation, debugging, and development guidance.
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            print(f"👨‍💻 Starting dev assistance for project {request.project_id}")
            
            # Create claude-code agent with dev-assistant
            agent = ClaudeCodeAgent(request.project_id, request.assistant_message_id)
            
            # Enhanced prompt for development assistance
            dev_prompt = f"""
As a senior development assistant, help with the following request:

{request.prompt}

Please provide:
1. Well-structured, maintainable code solutions
2. Clear explanations of implementation choices
3. Best practices and patterns to follow
4. Testing strategies and considerations
5. Documentation and comments where appropriate

Use your development tools to create high-quality solutions.
"""
            
            # Stream development assistance
            async for event in agent.run(
                prompt=dev_prompt,
                agent_type="dev-assistant", 
                max_turns=5
            ):
                data = json.dumps(event, default=str)
                yield f"data: {data}\n\n"
                
        except Exception as e:
            print(f"❌ Error in dev assistance: {e}")
            error_data = {
                "type": "error",
                "message": f"Development assistance error: {e!s}"
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        
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
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/agentic/test")
async def test_agentic_endpoint():
    """Test endpoint to verify the agentic API is working"""
    return {
        "message": "Agentic API is working!",
        "service": "claude-code-agentic-pipeline",
        "features": [
            "Multi-agent collaboration",
            "Intelligent task routing", 
            "Custom agent creation",
            "Specialized workflows",
            "Tool-aware execution"
        ],
        "endpoints": {
            "agentic_chat": "/api/agentic/chat/stream",
            "list_agents": "/api/agentic/agents/list", 
            "create_agent": "/api/agentic/agents/create",
            "code_analysis": "/api/agentic/code-analysis",
            "dev_assistant": "/api/agentic/dev-assistant",
            "test": "/api/agentic/test"
        },
    }