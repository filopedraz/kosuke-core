"""
Claude Code Agent - Advanced agentic pipeline using claude-code-sdk
"""
import time
from collections.abc import AsyncGenerator

from app.services.claude_code_service import ClaudeCodeService
from app.services.webhook_service import WebhookService


class ClaudeCodeAgent:
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

        print(f"🚀 Claude Code Agent initialized for project ID: {project_id}")

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

        # Collect all assistant response blocks for final webhook
        all_assistant_blocks = []

        # Track text block state for proper content_block_stop/start events
        current_text_block_active = False
        tool_executed_since_last_text = False

        try:
            # Stream events from claude-code-sdk
            async for event in self.claude_code_service.run_agentic_query(prompt, max_turns):
                self.total_actions += 1

                # Transform events to match our existing format
                if event["type"] == "text":
                    # If a tool was executed since the last text, we need to start a new text block
                    if tool_executed_since_last_text and current_text_block_active:
                        # End the previous text block
                        yield {"type": "content_block_stop"}
                        current_text_block_active = False

                    # If no text block is active, start a new one
                    if not current_text_block_active:
                        yield {"type": "content_block_start"}
                        current_text_block_active = True
                        tool_executed_since_last_text = False

                    yield {"type": "content_block_delta", "delta_type": "text_delta", "text": event["text"], "index": 0}

                    # Collect for webhook
                    all_assistant_blocks.append({"type": "text", "content": event["text"]})

                elif event["type"] == "tool_start":
                    # Mark that a tool has been executed since the last text
                    tool_executed_since_last_text = True

                    yield {
                        "type": "tool_start",
                        "tool_name": event["tool_name"],
                        "tool_input": event.get("tool_input", {}),
                        "tool_id": event.get("tool_id"),
                    }

                    # Store tool start info for webhook (will be updated with result on tool_stop)
                    all_assistant_blocks.append(
                        {
                            "type": "tool",
                            "id": event.get("tool_id"),
                            "name": event["tool_name"],
                            "status": "pending",
                        }
                    )

                elif event["type"] == "tool_stop":
                    yield {
                        "type": "tool_stop",
                        "tool_id": event["tool_id"],
                        "tool_result": event.get("tool_result", ""),
                        "is_error": event.get("is_error", False),
                    }

                    # Update the existing tool block with the result
                    for block in all_assistant_blocks:
                        if block.get("type") == "tool" and block.get("id") == event["tool_id"]:
                            block["result"] = event.get("tool_result", "")
                            block["status"] = "completed" if not event.get("is_error", False) else "error"
                            break

                elif event["type"] == "error":
                    # End any active text block before erroring
                    if current_text_block_active:
                        yield {"type": "content_block_stop"}

                    yield {"type": "error", "message": event["message"]}
                    await self._send_assistant_message_webhook(all_assistant_blocks, success=False)
                    return

                elif event["type"] == "message":
                    # Skip system messages to reduce noise in the UI
                    # These are typically ResultMessage/SystemMessage objects that aren't user-facing
                    pass

            # End any active text block before completing the message
            if current_text_block_active:
                yield {"type": "content_block_stop"}

            # Send completion events
            yield {"type": "message_complete"}
            await self._send_assistant_message_webhook(all_assistant_blocks, success=True)

        except Exception as e:
            # End any active text block before erroring
            if current_text_block_active:
                yield {"type": "content_block_stop"}

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
