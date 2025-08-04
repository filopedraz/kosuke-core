"""
Agent - Advanced agentic pipeline using claude-code-sdk
"""
import time
from collections.abc import AsyncGenerator

from app.services.claude_code_service import ClaudeCodeService
from app.services.webhook_service import WebhookService


class Agent:
    """
    Agent using claude-code-sdk for repository analysis and file modification

    This agent provides:
    - Repository analysis and understanding
    - Intelligent file modification
    - Tool-aware execution (Read, Write, Bash, Grep)
    - Automatic tool execution by claude-code-sdk
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