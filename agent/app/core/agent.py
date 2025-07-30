import os
import time
from collections.abc import AsyncGenerator

from anthropic import AsyncAnthropic

from app.core.prompts import build_simplified_system_prompt
from app.core.tools import execute_tool
from app.core.tools import get_anthropic_tools
from app.services.webhook_service import WebhookService
from app.utils.config import settings


class Agent:
    """
    Native Anthropic SDK Agent with thinking blocks and tool calling

    Streams events directly from Anthropic SDK with zero manipulation
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self.webhook_service = WebhookService()
        self.start_time = time.time()
        self.total_actions = 0

        # Initialize native Anthropic client
        self._initialize_client()
        print(f"🚀 Native Anthropic Agent initialized for project ID: {project_id}")

    def _initialize_client(self):
        """Initialize native Anthropic client"""
        try:
            api_key = settings.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not found in settings or environment")

            self.client = AsyncAnthropic(api_key=api_key)

            # Build system prompt
            self.system_prompt = build_simplified_system_prompt(self.project_id)
            print(f"📋 System prompt ready ({len(self.system_prompt)} chars)")

            print("🎯 Native Anthropic client initialized successfully")
        except Exception as e:
            print(f"⚠️ Failed to initialize client: {e}")
            raise

    async def run(self, prompt: str) -> AsyncGenerator[dict, None]:
        """Stream native Anthropic events with tool execution loop"""
        print(f"🤖 Processing request for project ID: {self.project_id}")
        processing_start = time.time()

        try:
            messages = [{"role": "user", "content": prompt}]

            while True:
                # Stream events to client
                async for event in self._stream_events(messages):
                    yield event

                # Process conversation turn and get content blocks
                content_blocks, task_completed, task_summary = await self._process_conversation_turn(messages)

                # Check if there are any tools to execute
                tool_calls = [block for block in content_blocks if block.get("type") == "tool_use"]

                # Execute any tool calls and yield results
                async for result in self._execute_tools(content_blocks):
                    yield result

                # Update conversation history
                self._update_conversation_history(messages, content_blocks)

                # Check if task was completed
                if task_completed:
                    yield {"type": "task_summary", "summary": task_summary}
                    yield {"type": "message_complete"}
                    await self._send_completion_webhook(success=True)
                    break

                # Break if no tools to execute (conversation is complete)
                if not tool_calls:
                    yield {"type": "message_complete"}
                    await self._send_completion_webhook(success=True)
                    break

        except Exception as e:
            error_msg = f"Error in agent: {e}"
            print(f"❌ {error_msg}")
            yield {"type": "error", "message": error_msg}
            await self._send_completion_webhook(success=False)

        processing_end = time.time()
        print(f"⏱️ Total processing time: {processing_end - processing_start:.2f}s")

    async def _process_conversation_turn(self, messages: list) -> tuple[list, bool, str | None]:
        """Process one conversation turn and return content blocks and completion status"""
        stream_params = {
            "model": "claude-3-7-sonnet-20250219",
            "max_tokens": 8192,
            "system": self.system_prompt,
            "messages": messages,
            "tools": get_anthropic_tools(self.project_id),
            "thinking": {"type": "enabled", "budget_tokens": 2048},
        }

        stream = await self.client.messages.create(**stream_params, stream=True)
        content_blocks = []

        # Stream events and collect content blocks
        async for event in stream:
            # Collect content for conversation history
            self._collect_content_from_event(event, content_blocks)

        print(f"🔍 Collected {len(content_blocks)} content blocks")

        # Check for task completion
        task_completed = any(
            block.get("name") == "task_completed" for block in content_blocks if block.get("type") == "tool_use"
        )
        task_summary = None
        if task_completed:
            for block in content_blocks:
                if block.get("type") == "tool_use" and block.get("name") == "task_completed":
                    task_summary = block.get("input", {}).get("summary", "Task completed")
                    break

        return content_blocks, task_completed, task_summary

    async def _stream_events(self, messages: list) -> AsyncGenerator[dict, None]:
        """Stream events from Anthropic API"""
        stream_params = {
            "model": "claude-3-7-sonnet-20250219",
            "max_tokens": 8192,
            "system": self.system_prompt,
            "messages": messages,
            "tools": get_anthropic_tools(self.project_id),
            "thinking": {"type": "enabled", "budget_tokens": 2048},
        }

        stream = await self.client.messages.create(**stream_params, stream=True)

        async for event in stream:
            event_dict = self._event_to_dict(event)
            if event_dict:
                yield event_dict

    def _collect_content_from_event(self, event, content_blocks: list):
        """Collect content blocks from streaming events"""
        if not hasattr(event, "type"):
            return

        self._ensure_content_tracking()

        if event.type == "content_block_start":
            self._handle_block_start(event)
        elif event.type == "content_block_delta":
            self._handle_block_delta(event)
        elif event.type == "content_block_stop":
            self._handle_block_stop(content_blocks)

    def _ensure_content_tracking(self):
        """Initialize content tracking if needed"""
        if not hasattr(self, "_current_content"):
            self._current_content = {"text": "", "thinking": "", "thinking_signature": "", "tool_calls": []}

    def _handle_block_start(self, event):
        """Handle content block start events"""
        if not (hasattr(event, "content_block") and hasattr(event.content_block, "type")):
            return

        if event.content_block.type == "tool_use":
            self._current_content["tool_calls"].append(
                {
                    "type": "tool_use",
                    "id": getattr(event.content_block, "id", ""),
                    "name": getattr(event.content_block, "name", ""),
                    "input": {},
                    "_input_json": "",
                }
            )

    def _handle_block_delta(self, event):
        """Handle content block delta events"""
        if not hasattr(event, "delta"):
            return

        delta = event.delta
        if hasattr(delta, "text"):
            self._current_content["text"] += delta.text
        elif hasattr(delta, "thinking"):
            self._current_content["thinking"] += delta.thinking
        elif hasattr(delta, "signature"):
            self._current_content["thinking_signature"] += delta.signature
        elif hasattr(delta, "partial_json") and self._current_content["tool_calls"]:
            self._current_content["tool_calls"][-1]["_input_json"] += delta.partial_json

    def _handle_block_stop(self, content_blocks: list):
        """Handle content block stop events"""
        # Finalize text content
        if self._current_content["text"]:
            content_blocks.append({"type": "text", "text": self._current_content["text"]})
            self._current_content["text"] = ""

        # Finalize thinking content
        if self._current_content["thinking"]:
            content_blocks.append(
                {
                    "type": "thinking",
                    "thinking": self._current_content["thinking"],
                    "signature": self._current_content["thinking_signature"],
                }
            )
            self._current_content["thinking"] = ""
            self._current_content["thinking_signature"] = ""

        # Finalize tool calls
        for tool_call in self._current_content["tool_calls"]:
            if "_input_json" in tool_call:
                try:
                    import json

                    tool_call["input"] = json.loads(tool_call["_input_json"])
                    del tool_call["_input_json"]
                except json.JSONDecodeError:
                    del tool_call["_input_json"]  # Remove invalid JSON
                content_blocks.append(tool_call)
        self._current_content["tool_calls"] = []

    async def _execute_tools(self, content_blocks: list) -> AsyncGenerator[dict, None]:
        """Execute tool calls and yield results"""
        tool_calls = [block for block in content_blocks if block.get("type") == "tool_use"]

        for tool_call in tool_calls:
            yield {"type": "tool_start", "tool_name": tool_call["name"]}

            try:
                result = await execute_tool(tool_call["name"], tool_call["input"], self.project_id)
                yield {"type": "tool_complete", "tool_name": tool_call["name"], "result": result}
            except Exception as e:
                yield {"type": "tool_error", "tool_name": tool_call["name"], "error": str(e)}

    def _update_conversation_history(self, messages: list, content_blocks: list):
        """Update conversation history with proper block ordering"""
        if not content_blocks:
            return

        # Separate and reorder blocks (thinking first, as required by Anthropic)
        thinking_blocks = [b for b in content_blocks if b.get("type") == "thinking"]
        text_blocks = [b for b in content_blocks if b.get("type") == "text"]
        tool_blocks = [b for b in content_blocks if b.get("type") == "tool_use"]

        ordered_content = thinking_blocks + text_blocks + tool_blocks
        messages.append({"role": "assistant", "content": ordered_content})

        # Add tool results for next turn
        tool_results = []
        for tool_call in tool_blocks:
            try:
                result = f"Tool {tool_call['name']} executed successfully"
                tool_results.append({"type": "tool_result", "tool_use_id": tool_call["id"], "content": result})
            except Exception as e:
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_call["id"],
                        "content": f"Tool {tool_call['name']} failed: {e}",
                        "is_error": True,
                    }
                )

        if tool_results:
            messages.append({"role": "user", "content": tool_results})

    def _event_to_dict(self, event) -> dict | None:
        """Convert Anthropic event to dict for streaming"""
        if not hasattr(event, "type"):
            return None

        event_dict = {"type": event.type}

        # Add text content for streaming
        if hasattr(event, "delta") and hasattr(event.delta, "text"):
            event_dict["text"] = event.delta.text

        # Add index if present
        if hasattr(event, "index"):
            event_dict["index"] = event.index

        return event_dict

    async def _send_completion_webhook(self, success: bool = True):
        """Send completion webhook to Next.js"""
        try:
            duration = time.time() - self.start_time

            async with self.webhook_service as webhook:
                await webhook.send_completion(
                    project_id=self.project_id,
                    success=success,
                    total_actions=self.total_actions,
                    total_tokens=0,  # Token counting handled by Anthropic
                    duration=duration,
                )

            print(f"✅ Sent completion webhook: {self.total_actions} actions, {duration:.2f}s")
        except Exception as e:
            print(f"❌ Failed to send completion webhook: {e}")
