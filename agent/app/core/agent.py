"""
Agent - Advanced agentic pipeline using claude-code-sdk with Langfuse observability
"""
import time
from collections.abc import AsyncGenerator
from functools import wraps
from typing import Any, Callable
import asyncio

from langfuse import get_client
from app.services.claude_code_service import ClaudeCodeService
from app.services.webhook_service import WebhookService

# Get Langfuse client instance
langfuse = get_client()


def observe_agentic_workflow(operation_name: str):
    """
    Decorator for observing agentic workflows with Langfuse
    
    This provides comprehensive tracing for claude-code-sdk operations including:
    - Full workflow traces with input/output
    - Token usage tracking
    - Error handling and monitoring
    - Performance metrics
    - Tool usage analytics
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(self, prompt: str, max_turns: int = 25, **kwargs) -> AsyncGenerator[dict, None]:
            # Create comprehensive trace for the agentic workflow
            trace = langfuse.trace(
                name=operation_name,
                input={
                    "prompt": prompt,
                    "max_turns": max_turns,
                    "project_id": self.project_id,
                    "assistant_message_id": self.assistant_message_id,
                },
                metadata={
                    "service": "claude-code-sdk",
                    "model": "claude-3-7-sonnet-20250219",  # Based on config
                    "project_path": str(self.claude_code_service.project_path),
                    "start_time": time.time(),
                },
                tags=["agent", "claude-code", "agentic", f"project-{self.project_id}"],
                user_id=f"project-{self.project_id}",  # Use project as user context
                session_id=f"session-{self.assistant_message_id}" if self.assistant_message_id else None,
            )

            # Track accumulated data for final trace update
            collected_output = []
            tool_executions = []
            error_occurred = False
            error_details = None

            try:
                # Execute the original function and collect data
                async for event in func(self, prompt, max_turns, **kwargs):
                    # Collect output for tracing
                    if event.get("type") == "content_block_delta":
                        collected_output.append(event.get("text", ""))
                    elif event.get("type") == "tool_start":
                        tool_executions.append({
                            "tool_name": event.get("tool_name"),
                            "tool_input": event.get("tool_input", {}),
                            "tool_id": event.get("tool_id"),
                            "status": "started"
                        })
                    elif event.get("type") == "tool_stop":
                        # Update tool execution with result
                        tool_id = event.get("tool_id")
                        for tool in tool_executions:
                            if tool.get("tool_id") == tool_id:
                                tool.update({
                                    "tool_result": event.get("tool_result", ""),
                                    "is_error": event.get("is_error", False),
                                    "status": "completed"
                                })
                                break
                    elif event.get("type") == "error":
                        error_occurred = True
                        error_details = event.get("message", "Unknown error")

                    # Yield the event to maintain streaming behavior
                    yield event

                # Get final token usage from claude-code service
                token_usage = self.claude_code_service.get_token_usage()

                # Update trace with comprehensive final data
                trace.update(
                    output={
                        "response": "".join(collected_output),
                        "tool_executions": tool_executions,
                        "total_actions": self.total_actions,
                        "duration": time.time() - self.start_time,
                        "success": not error_occurred,
                        "error_details": error_details if error_occurred else None,
                    },
                    usage={
                        "input_tokens": token_usage["input_tokens"],
                        "output_tokens": token_usage["output_tokens"],
                        "total_tokens": token_usage["total_tokens"],
                        "context_tokens": token_usage["context_tokens"],
                    },
                    level="ERROR" if error_occurred else "DEFAULT",
                )

                # Add custom metrics for agentic workflows
                langfuse.score(
                    trace_id=trace.id,
                    name="workflow-completion",
                    value=1.0 if not error_occurred else 0.0,
                    comment=f"Workflow completed with {len(tool_executions)} tool executions"
                )

                if tool_executions:
                    langfuse.score(
                        trace_id=trace.id,
                        name="tool-usage-efficiency",
                        value=len([t for t in tool_executions if not t.get("is_error", False)]) / len(tool_executions),
                        comment=f"Tool success rate: {len([t for t in tool_executions if not t.get('is_error', False)])}/{len(tool_executions)}"
                    )

            except Exception as e:
                # Handle any unexpected errors
                trace.update(
                    output={
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "partial_output": "".join(collected_output),
                        "tool_executions": tool_executions,
                    },
                    level="ERROR"
                )
                
                # Add error score
                langfuse.score(
                    trace_id=trace.id,
                    name="workflow-completion",
                    value=0.0,
                    comment=f"Workflow failed with error: {str(e)}"
                )
                
                raise
            finally:
                # Always end the trace
                trace.end()

        return wrapper
    return decorator


class Agent:
    """
    Agent using claude-code-sdk for repository analysis and file modification
    
    Features:
    - Repository analysis and understanding
    - Intelligent file modification
    - Tool-aware execution (Read, Write, Bash, Grep)
    - Automatic tool execution by claude-code-sdk
    - Comprehensive Langfuse observability
    """

    def __init__(self, project_id: int, assistant_message_id: int | None = None):
        self.project_id = project_id
        self.assistant_message_id = assistant_message_id
        self.webhook_service = WebhookService()
        self.start_time = time.time()
        self.total_actions = 0

        # Initialize claude-code service
        self.claude_code_service = ClaudeCodeService(project_id)

        print(f"🚀 Agent initialized for project ID: {project_id}")

    @observe_agentic_workflow("claude-code-agentic-pipeline")
    async def run(self, prompt: str, max_turns: int = 25) -> AsyncGenerator[dict, None]:
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

        # Initialize state for text block tracking
        text_state = {"active": False, "content": "", "all_blocks": []}

        try:
            # Stream events from claude-code-sdk
            async for event in self.claude_code_service.run_agentic_query(prompt, max_turns):
                self.total_actions += 1

                # Process event and yield results
                async for result in self._process_event(event, text_state):
                    yield result

            # Finalize processing
            await self._finalize_processing(text_state)
            yield {"type": "message_complete"}

        except Exception as e:
            await self._handle_error(e, text_state)
            yield {"type": "error", "message": f"Error in claude-code agent: {e}"}

        processing_end = time.time()
        print(f"⏱️ Total claude-code processing time: {processing_end - processing_start:.2f}s")

    async def _process_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Process a single event from the claude-code service"""
        event_type = event["type"]

        if event_type == "text":
            async for result in self._handle_text_event(event, text_state):
                yield result
        elif event_type == "tool_start":
            async for result in self._handle_tool_start_event(event, text_state):
                yield result
        elif event_type == "tool_stop":
            async for result in self._handle_tool_stop_event(event, text_state):
                yield result
        elif event_type == "error":
            async for result in self._handle_error_event(event, text_state):
                yield result
        elif event_type == "message":
            # Skip system messages to reduce noise in the UI
            pass

    async def _handle_text_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle text events"""
        # If no text block is active, start a new one
        if not text_state["active"]:
            yield {"type": "content_block_start"}
            text_state["active"] = True
            text_state["content"] = ""

        # Pass through text chunks and accumulate content
        yield {"type": "content_block_delta", "delta_type": "text_delta", "text": event["text"], "index": 0}
        text_state["content"] += event["text"]

    async def _handle_tool_start_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle tool start events"""
        # End any active text block before starting a tool
        if text_state["active"]:
            yield {"type": "content_block_stop"}
            self._save_text_content(text_state)

        yield {
            "type": "tool_start",
            "tool_name": event["tool_name"],
            "tool_input": event.get("tool_input", {}),
            "tool_id": event.get("tool_id"),
        }

        # Store tool start info for webhook
        text_state["all_blocks"].append(
            {
                "type": "tool",
                "id": event.get("tool_id"),
                "name": event["tool_name"],
                "input": event.get("tool_input", {}),
                "status": "pending",
            }
        )

    async def _handle_tool_stop_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle tool stop events"""
        yield {
            "type": "tool_stop",
            "tool_id": event["tool_id"],
            "tool_result": event.get("tool_result", ""),
            "is_error": event.get("is_error", False),
        }

        # Update the existing tool block with the result
        self._update_tool_block(event, text_state["all_blocks"])

    async def _handle_error_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle error events"""
        if text_state["active"]:
            yield {"type": "content_block_stop"}
            self._save_text_content(text_state)

        yield {"type": "error", "message": event["message"]}
        await self._send_assistant_message_webhook(text_state["all_blocks"], success=False)

    def _save_text_content(self, text_state: dict):
        """Save accumulated text content and reset state"""
        if text_state["content"].strip():
            text_state["all_blocks"].append({"type": "text", "content": text_state["content"]})
        text_state["active"] = False
        text_state["content"] = ""

    def _update_tool_block(self, event: dict, all_blocks: list):
        """Update tool block with result"""
        for block in all_blocks:
            if block.get("type") == "tool" and block.get("id") == event["tool_id"]:
                block["result"] = event.get("tool_result", "")
                block["status"] = "completed" if not event.get("is_error", False) else "error"
                break

    async def _finalize_processing(self, text_state: dict):
        """Finalize processing and send webhooks"""
        if text_state["active"]:
            self._save_text_content(text_state)
        await self._send_assistant_message_webhook(text_state["all_blocks"], success=True)

    async def _handle_error(self, error: Exception, text_state: dict):
        """Handle errors during processing"""
        if text_state["active"]:
            self._save_text_content(text_state)
        print(f"❌ Error in claude-code agent: {error}")
        await self._send_assistant_message_webhook(text_state["all_blocks"], success=False)

    async def _send_assistant_message_webhook(self, assistant_blocks: list, success: bool = True):
        """Send complete assistant message with all blocks to Next.js"""
        try:
            duration = time.time() - self.start_time

            # Get token usage from claude-code service
            token_usage = self.claude_code_service.get_token_usage()

            # Send assistant message with blocks
            async with self.webhook_service as webhook:
                await webhook.send_assistant_message(
                    project_id=self.project_id,
                    blocks=assistant_blocks,
                    tokens_input=token_usage["input_tokens"],
                    tokens_output=token_usage["output_tokens"],
                    context_tokens=token_usage["context_tokens"],
                    assistant_message_id=self.assistant_message_id,
                )

            print(
                f"✅ Sent assistant message webhook: {len(assistant_blocks)} blocks, "
                f"{token_usage['total_tokens']} tokens"
            )

            # Send completion webhook
            async with self.webhook_service as webhook:
                await webhook.send_completion(
                    project_id=self.project_id,
                    success=success,
                    total_actions=self.total_actions,
                    total_tokens=token_usage["total_tokens"],
                    duration=duration,
                )

            print(
                f"✅ Sent completion webhook: {self.total_actions} actions, {duration:.2f}s, "
                f"{token_usage['total_tokens']} tokens"
            )
        except Exception as e:
            print(f"❌ Failed to send webhooks: {e}")
