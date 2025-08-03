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
    Agent using claude-code-sdk for repository analysis and file modification
    
    This agent provides:
    - Repository analysis and understanding
    - Intelligent file modification
    - Tool-aware execution (Read, Write, Bash, Grep)
    - Automatic tool execution by claude-code-sdk
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
        
    async def run(self, prompt: str, max_turns: int = 5) -> AsyncGenerator[dict, None]:
        """
        Run the claude-code agent for repository analysis and modification
        
        Args:
            prompt: User prompt/query
            max_turns: Maximum conversation turns
            
        Yields:
            Stream of events compatible with existing chat interface
        """
        print(f"🤖 Processing claude-code request for project ID: {self.project_id}")
        processing_start = time.time()
        
        # Collect all assistant response blocks for final webhook
        all_assistant_blocks = []
        
        try:
            # Stream events from claude-code-sdk
            async for event in self.claude_code_service.run_agentic_query(prompt, max_turns):
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
        print(f"⏱️ Total claude-code processing time: {processing_end - processing_start:.2f}s")
    
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