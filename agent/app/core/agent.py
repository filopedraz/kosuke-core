import os
import time
from collections.abc import AsyncGenerator

import anthropic

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

            self.client = anthropic.Anthropic(api_key=api_key)

            # Build system prompt
            self.system_prompt = build_simplified_system_prompt(self.project_id)
            print(f"📋 System prompt ready ({len(self.system_prompt)} chars)")

            print("🎯 Native Anthropic client initialized successfully")
        except Exception as e:
            print(f"⚠️ Failed to initialize client: {e}")
            raise

    async def run(self, prompt: str) -> AsyncGenerator[dict, None]:
        """
        Stream native Anthropic events with tool execution loop
        """
        print(f"🤖 Processing request for project ID: {self.project_id}")
        processing_start = time.time()

        try:
            messages = [{"role": "user", "content": prompt}]

            conversation_turn = 0
            while True:
                conversation_turn += 1

                # Only enable thinking for the first turn to avoid conversation history issues
                thinking_config = (
                    {
                        "type": "enabled",
                        "budget_tokens": 2048,
                    }
                    if conversation_turn == 1
                    else None
                )

                # Stream response from Claude
                stream_params = {
                    "model": "claude-3-7-sonnet-20250219",
                    "max_tokens": 8192,
                    "system": self.system_prompt,
                    "messages": messages,
                    "tools": get_anthropic_tools(self.project_id),
                }

                if thinking_config:
                    stream_params["thinking"] = thinking_config

                with self.client.messages.stream(**stream_params) as stream:
                    # Stream events and yield them (using regular for loop)
                    for event in stream:
                        # Process event with proper data extraction
                        event_dict = self._event_to_dict(event)
                        if event_dict:
                            yield event_dict

                    # Get the final message after streaming completes
                    final_message = stream.get_final_message()

                    # Extract content blocks from final message
                    content_blocks = []

                    for block in final_message.content:
                        block_type = getattr(block, "type", None)
                        if block_type == "thinking" and conversation_turn == 1:
                            # For first turn with thinking, create redacted thinking for conversation history
                            content_blocks.append(
                                {"type": "redacted_thinking", "thinking": "[Thinking from previous turn]"}
                            )
                        elif block_type in ["text", "tool_use"]:
                            content_blocks.append(block)

                # Debug: Log content block collection
                print(f"🔍 Collected {len(content_blocks)} content blocks for conversation history")

                # Check if we have tool calls to execute
                tool_calls = [block for block in content_blocks if getattr(block, "type", None) == "tool_use"]

                if not tool_calls:
                    # No tool calls, we're done
                    yield {"type": "message_complete"}
                    await self._send_completion_webhook(success=True)
                    break

                # Execute tools sequentially
                tool_results = []
                for tool_call in tool_calls:
                    yield {"type": "tool_start", "tool_name": tool_call.name}

                    try:
                        result = await execute_tool(tool_call.name, tool_call.input, self.project_id)
                        tool_results.append({"type": "tool_result", "tool_use_id": tool_call.id, "content": result})
                        yield {"type": "tool_complete", "tool_name": tool_call.name, "result": result}

                    except Exception as e:
                        error_result = f"Tool {tool_call.name} failed: {e}"
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_call.id,
                                "content": error_result,
                                "is_error": True,
                            }
                        )
                        yield {"type": "tool_error", "tool_name": tool_call.name, "error": str(e)}

                # Add assistant message with ONLY text and tool_use blocks (NO thinking blocks)
                if content_blocks:
                    messages.append({"role": "assistant", "content": content_blocks})

                # Add tool results
                if tool_results:
                    messages.append({"role": "user", "content": tool_results})

                # Continue the conversation loop

        except Exception as e:
            error_msg = f"Error in agent: {e}"
            print(f"❌ {error_msg}")
            yield {"type": "error", "message": error_msg}
            await self._send_completion_webhook(success=False)

        processing_end = time.time()
        print(f"⏱️ Total processing time: {processing_end - processing_start:.2f}s")

    def _event_to_dict(self, event) -> dict | None:
        """Convert Anthropic event to dict with proper streaming support"""
        try:
            # Handle different event types from Anthropic SDK
            if not hasattr(event, "type"):
                return None

            event_dict = {"type": event.type}

            # Handle text deltas for streaming
            if hasattr(event, "delta") and event.delta:
                if hasattr(event.delta, "text"):
                    event_dict["text"] = event.delta.text
                if hasattr(event.delta, "type"):
                    event_dict["delta_type"] = event.delta.type

            # Handle content block information
            if hasattr(event, "content_block"):
                block = event.content_block
                if hasattr(block, "type"):
                    event_dict["content_type"] = block.type

                    # For thinking blocks, add thinking content
                    if block.type == "thinking" and hasattr(block, "thinking"):
                        event_dict["thinking"] = block.thinking

                    # For text blocks, add text content
                    if block.type == "text" and hasattr(block, "text"):
                        event_dict["content"] = block.text

                    # For tool use blocks, add tool info
                    if block.type == "tool_use" and hasattr(block, "name"):
                        event_dict["tool_name"] = block.name
                        if hasattr(block, "input"):
                            event_dict["tool_input"] = block.input

            # Add index for multiple content blocks
            if hasattr(event, "index"):
                event_dict["index"] = event.index

            return event_dict

        except Exception as e:
            print(f"⚠️ Error converting event: {e}")
            return {"type": "error", "message": f"Event conversion error: {e}"}

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
