import os
import time
from collections.abc import AsyncGenerator

from pydantic_ai import Agent as PydanticAgent
from pydantic_ai import RunContext
from pydantic_ai.models.anthropic import AnthropicModel

from app.core.prompts import build_simplified_system_prompt
from app.core.tools import create_directory
from app.core.tools import create_file
from app.core.tools import delete_file
from app.core.tools import edit_file
from app.core.tools import read_file
from app.core.tools import remove_directory
from app.core.tools import task_completed
from app.services.webhook_service import WebhookService
from app.utils.config import settings


class Agent:
    """
    Modernized Agent class using Pydantic AI's advanced features

    Uses native thinking blocks, structured outputs, and @tool decorators
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self.webhook_service = WebhookService()
        self.start_time = time.time()
        self.total_actions = 0

        # Initialize advanced PydanticAI agent
        self._initialize_agent()
        print(f"🚀 Modern Agent initialized for project ID: {project_id}")

    def _initialize_agent(self):
        """Initialize PydanticAI agent with advanced Anthropic configuration"""
        try:
            # Set API key
            if settings.anthropic_api_key:
                os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key

            # Enhanced model for PydanticAI 0.4.1 with thinking blocks enabled
            self.model = AnthropicModel(
                settings.model_name,
                # Model settings will be applied at runtime
            )

            # Simplified system prompt focused on context, not format
            system_prompt = build_simplified_system_prompt(self.project_id)
            print(f"📋 Initialized with simplified system prompt ({len(system_prompt)} chars)")

            # Create agent with tools but NO structured output to allow thinking blocks
            self.agent = PydanticAgent(
                model=self.model,
                # NO result_type - this allows thinking blocks and tool execution
                system_prompt=system_prompt,
                deps_type=int,  # project_id dependency
                tools=[
                    read_file,
                    edit_file,
                    create_file,
                    delete_file,
                    create_directory,
                    remove_directory,
                    task_completed,
                ],
                instrument=True,  # Langfuse instrumentation
            )

            print("🎯 Advanced Pydantic AI agent initialized successfully")
        except Exception as e:
            print(f"⚠️ Failed to initialize agent: {e}")
            raise

    async def run(self, prompt: str, chat_history: list | None = None) -> AsyncGenerator[dict, None]:
        """
        Main agent workflow with iterative task completion

        Continues working until the task is genuinely completed, not just after one iteration
        """
        print(f"🤖 Processing request for project ID: {self.project_id}")
        processing_start = time.time()

        try:
            # Use PydanticAI's streaming capability to capture thinking blocks
            model_settings = {
                "anthropic_thinking": {
                    "type": "enabled",
                    "budget_tokens": 2048,  # Allocate tokens for thinking
                },
                "max_tokens": 4096,
                "temperature": 1.0,  # Required to be 1.0 when thinking is enabled
            }

            print("🔄 Starting agent conversation...")
            task_completed_called = False

            # Try single-turn approach first - let the agent continue naturally
            async with self.agent.run_stream(prompt, deps=self.project_id, model_settings=model_settings) as result:
                # Stream text content (includes thinking blocks when enabled)
                async for text_chunk in result.stream(debounce_by=0.01):
                    yield {
                        "type": "text",
                        "file_path": "",
                        "message": text_chunk,
                        "status": "pending",
                    }

                # Debug: Check what messages and parts we're getting
                print(f"🔍 Debug: Found {len(result.new_messages())} new messages")

                # Check if tools were used by looking at new messages
                for message_idx, message in enumerate(result.new_messages()):
                    print(
                        f"🔍 Message {message_idx}: role={getattr(message, 'role', 'unknown')}, "
                        f"parts count={len(message.parts)}"
                    )

                    for part_idx, part in enumerate(message.parts):
                        print(f"🔍 Part {part_idx}: type={type(part).__name__}")

                        # Check if this is a tool call
                        if hasattr(part, "tool_name"):  # Tool call detected
                            print(f"🔧 Tool call detected: {part.tool_name}")

                            # Safely extract file_path from args
                            file_path = ""
                            if hasattr(part, "args") and isinstance(part.args, dict):
                                file_path = part.args.get("file_path", "")
                            elif hasattr(part, "args_as_dict"):
                                try:
                                    args_dict = part.args_as_dict()
                                    file_path = args_dict.get("file_path", "")
                                except Exception as e:
                                    print(f"Warning: Could not extract file_path from tool args: {e}")

                            # Check if this is the task_completed tool
                            if part.tool_name == "task_completed":
                                task_completed_called = True
                                print("✅ Task completion detected via tool call")
                                # Extract summary from tool args
                                summary = ""
                                if hasattr(part, "args") and isinstance(part.args, dict):
                                    summary = part.args.get("summary", "Task completed")
                                elif hasattr(part, "args_as_dict"):
                                    try:
                                        args_dict = part.args_as_dict()
                                        summary = args_dict.get("summary", "Task completed")
                                    except Exception:
                                        summary = "Task completed"

                                yield {
                                    "type": "completed",
                                    "file_path": "",
                                    "message": summary,
                                    "status": "completed",
                                }
                            else:
                                # Regular tool call - tools execute automatically in PydanticAI
                                self.total_actions += 1  # Track total actions

                                yield {
                                    "type": "operation_start",
                                    "file_path": file_path,
                                    "message": f"Executing {part.tool_name}...",
                                    "operation": part.tool_name,
                                    "status": "pending",
                                }

                                # Tool has already been executed by PydanticAI at this point
                                yield {
                                    "type": "operation_completed",
                                    "file_path": file_path,
                                    "message": f"Completed {part.tool_name}",
                                    "operation": part.tool_name,
                                    "status": "completed",
                                }

                        # Check if this is a tool return (result of tool execution)
                        elif hasattr(part, "content") and hasattr(part, "tool_call_id"):
                            print(f"🔧 Tool result detected for call_id: {getattr(part, 'tool_call_id', 'unknown')}")
                            # This is the result of a tool call - already processed above

            # Send completion webhook if task was completed
            if task_completed_called:
                await self._send_completion_webhook(success=True)
            else:
                print("⚠️ Agent finished without calling task_completed")

        except Exception as e:
            error_msg = f"Error in modern agent: {e}"
            print(f"❌ {error_msg}")
            yield {
                "type": "error",
                "file_path": "",
                "message": f"Agent error: {error_msg}",
                "status": "error",
                "error_type": "processing",
            }

        processing_end = time.time()
        print(f"⏱️ Total processing time: {processing_end - processing_start:.2f}s")

    def _create_context(self) -> RunContext[int]:
        """Create a RunContext for manual tool execution"""

        # Simple context wrapper for manual execution
        # In a full PydanticAI setup, this would be handled automatically
        class SimpleContext:
            def __init__(self, project_id: int):
                self.deps = project_id

        return SimpleContext(self.project_id)

    async def _send_completion_webhook(self, success: bool = True):
        """Send completion webhook to Next.js"""
        try:
            duration = time.time() - self.start_time

            async with self.webhook_service as webhook:
                await webhook.send_completion(
                    project_id=self.project_id,
                    success=success,
                    total_actions=self.total_actions,
                    total_tokens=0,  # Token counting handled by Pydantic AI
                    duration=duration,
                )

            print(f"✅ Sent completion webhook: {self.total_actions} actions, {duration:.2f}s")
        except Exception as e:
            print(f"❌ Failed to send completion webhook: {e}")
