"""
Claude Code Agent - Advanced agentic pipeline using claude-code-sdk
"""
import time
from collections.abc import AsyncGenerator
from typing import Dict, Any, Optional

from app.services.claude_code_service import ClaudeCodeService
from app.services.webhook_service import WebhookService
from app.utils.config import settings


class ClaudeCodeAgent:
    """
    Advanced agent using claude-code-sdk for agentic workflows
    
    This agent provides:
    - Multi-agent collaboration
    - Tool-aware task routing
    - File-based agent definitions
    - Parallel execution capabilities
    """
    
    def __init__(self, project_id: int, assistant_message_id: Optional[int] = None):
        self.project_id = project_id
        self.assistant_message_id = assistant_message_id
        self.webhook_service = WebhookService()
        self.start_time = time.time()
        self.total_actions = 0
        
        # Initialize claude-code service
        self.claude_code_service = ClaudeCodeService(project_id)
        
        print(f"🚀 Claude Code Agent initialized for project ID: {project_id}")
        
    async def run(self, prompt: str, agent_type: Optional[str] = None, max_turns: int = 5) -> AsyncGenerator[dict, None]:
        """
        Run the agentic pipeline with claude-code-sdk
        
        Args:
            prompt: User prompt/query
            agent_type: Specific agent type to use (optional)
            max_turns: Maximum conversation turns
            
        Yields:
            Stream of events from the agentic pipeline
        """
        print(f"🤖 Processing agentic request for project ID: {self.project_id}")
        processing_start = time.time()
        
        # Collect all assistant response blocks for final webhook
        all_assistant_blocks = []
        
        try:
            # Choose the appropriate query method
            if agent_type:
                query_stream = self.claude_code_service.query_with_specific_agent(prompt, agent_type)
            else:
                query_stream = self.claude_code_service.run_agentic_query(prompt, max_turns)
            
            # Stream events from claude-code-sdk
            async for event in query_stream:
                self.total_actions += 1
                
                # Transform events to match our existing format
                if event["type"] == "text":
                    yield {
                        "type": "content_block_delta",
                        "delta": {"type": "text", "text": event["text"]},
                        "index": 0
                    }
                    
                    # Collect for webhook
                    all_assistant_blocks.append({
                        "type": "text",
                        "content": event["text"]
                    })
                    
                elif event["type"] == "tool_start":
                    yield {
                        "type": "tool_start",
                        "tool_name": event["tool_name"],
                        "tool_input": event.get("tool_input", {}),
                        "tool_id": event.get("tool_id")
                    }
                    
                    # Collect for webhook
                    all_assistant_blocks.append({
                        "type": "tool",
                        "name": event["tool_name"],
                        "input": event.get("tool_input", {}),
                        "result": "Tool executed via claude-code",
                        "status": "completed"
                    })
                    
                elif event["type"] == "error":
                    yield {
                        "type": "error",
                        "message": event["message"]
                    }
                    await self._send_assistant_message_webhook(all_assistant_blocks, success=False)
                    return
                    
                elif event["type"] == "message":
                    yield {
                        "type": "message_chunk",
                        "message": event["message"]
                    }
            
            # Send completion events
            yield {"type": "message_complete"}
            await self._send_assistant_message_webhook(all_assistant_blocks, success=True)
            
        except Exception as e:
            error_msg = f"Error in claude-code agent: {e}"
            print(f"❌ {error_msg}")
            yield {"type": "error", "message": error_msg}
            await self._send_assistant_message_webhook(all_assistant_blocks, success=False)
        
        processing_end = time.time()
        print(f"⏱️ Total agentic processing time: {processing_end - processing_start:.2f}s")
    
    async def list_agents(self) -> AsyncGenerator[dict, None]:
        """
        List available agents in the project
        
        Yields:
            Available agent information
        """
        try:
            agents = self.claude_code_service.list_available_agents()
            yield {
                "type": "agents_list",
                "agents": agents,
                "project_context": self.claude_code_service.get_project_context()
            }
        except Exception as e:
            yield {
                "type": "error",
                "message": f"Error listing agents: {e}"
            }
    
    async def create_custom_agent(self, agent_type: str, description: str, 
                                 system_prompt: str, allowed_tools: list = None,
                                 when_to_use: str = None) -> AsyncGenerator[dict, None]:
        """
        Create a new custom agent
        
        Args:
            agent_type: Unique identifier for the agent
            description: Agent description
            system_prompt: System prompt for the agent
            allowed_tools: Tools the agent can use
            when_to_use: When this agent should be used
            
        Yields:
            Agent creation status
        """
        try:
            agent_file = self.claude_code_service.create_agent(
                agent_type=agent_type,
                description=description,
                system_prompt=system_prompt,
                allowed_tools=allowed_tools or ["Read", "Write", "Bash"],
                when_to_use=when_to_use
            )
            
            yield {
                "type": "agent_created",
                "agent_type": agent_type,
                "agent_file": str(agent_file),
                "message": f"Agent '{agent_type}' created successfully"
            }
            
        except Exception as e:
            yield {
                "type": "error",
                "message": f"Error creating agent: {e}"
            }
    
    async def _send_assistant_message_webhook(self, assistant_blocks: list, success: bool = True):
        """Send complete assistant message with all blocks to Next.js"""
        try:
            duration = time.time() - self.start_time
            
            # Send assistant message with blocks
            async with self.webhook_service as webhook:
                await webhook.send_assistant_message(
                    project_id=self.project_id,
                    blocks=assistant_blocks,
                    tokens_input=0,  # Token counting handled by claude-code-sdk
                    tokens_output=0,
                    context_tokens=0,
                    assistant_message_id=self.assistant_message_id,
                )
            
            print(f"✅ Sent assistant message webhook: {len(assistant_blocks)} blocks")
            
            # Send completion webhook
            async with self.webhook_service as webhook:
                await webhook.send_completion(
                    project_id=self.project_id,
                    success=success,
                    total_actions=self.total_actions,
                    total_tokens=0,  # Token counting handled by claude-code-sdk
                    duration=duration,
                )
            
            print(f"✅ Sent completion webhook: {self.total_actions} actions, {duration:.2f}s")
        except Exception as e:
            print(f"❌ Failed to send webhooks: {e}")