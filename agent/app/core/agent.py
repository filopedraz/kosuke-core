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
from app.models.actions import AgentResponse
from app.models.actions import FileOperation
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

            # Enhanced model for PydanticAI 0.4.1
            self.model = AnthropicModel(
                settings.model_name,
                # Modern PydanticAI 0.4.1 API - no settings parameter
                # Thinking blocks are handled automatically by PydanticAI
            )

            # Simplified system prompt focused on context, not format
            system_prompt = build_simplified_system_prompt(self.project_id)
            print(f"📋 Initialized with simplified system prompt ({len(system_prompt)} chars)")

            # Create agent with structured output and tools
            self.agent = PydanticAgent(
                model=self.model,
                result_type=AgentResponse,  # Structured output guaranteed
                system_prompt=system_prompt,
                deps_type=int,  # project_id dependency
                tools=[
                    read_file,
                    edit_file,
                    create_file,
                    delete_file,
                    create_directory,
                    remove_directory,
                ],
                instrument=True,  # Langfuse instrumentation
            )

            print("🎯 Advanced Pydantic AI agent initialized successfully")
        except Exception as e:
            print(f"⚠️ Failed to initialize agent: {e}")
            raise

    async def run(self, prompt: str) -> AsyncGenerator[dict, None]:
        """
        Main agent workflow with native Pydantic AI streaming

        Uses structured outputs and native thinking blocks
        """
        print(f"🤖 Processing request for project ID: {self.project_id}")
        processing_start = time.time()

        try:
            yield {
                "type": "thinking",
                "file_path": "",
                "message": "Initializing modern agent with thinking blocks...",
                "status": "pending",
            }

            # For structured outputs, we can't use stream_text()
            # Instead, run the agent and get the structured result directly
            result = await self.agent.run(prompt, deps=self.project_id)

            # Simulate streaming with thinking message
            yield {
                "type": "text",
                "file_path": "",
                "message": f"Processing request: {prompt[:100]}{'...' if len(prompt) > 100 else ''}",
                "status": "pending",
            }

            # Get the structured result
            final_result = result

            # Execute actions from structured response
            if final_result.data and final_result.data.actions:
                async for update in self._execute_structured_actions(final_result.data.actions):
                    yield update

            # Send completion
            yield {
                "type": "completed",
                "file_path": "",
                "message": "All changes have been implemented successfully!",
                "status": "completed",
            }

            # Send completion webhook
            await self._send_completion_webhook(success=True)

        except Exception as e:
            error_msg = f"Error in modern agent: {e}"
            print(f"❌ {error_msg}")

            yield {
                "type": "error",
                "file_path": "",
                "message": error_msg,
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

    async def _execute_structured_actions(self, actions: list[FileOperation]) -> AsyncGenerator[dict, None]:
        """Execute structured actions from Pydantic AI response"""
        print(f"🔄 Executing {len(actions)} structured actions")

        for i, action in enumerate(actions):
            print(f"⏳ Executing action {i+1}/{len(actions)}: {action.operation} on {action.file_path}")

            try:
                success = False
                ctx = self._create_context()

                # Execute based on operation type
                if action.operation == "read":
                    await read_file(ctx, action.file_path)
                    success = True
                elif action.operation == "edit":
                    await edit_file(ctx, action.file_path, action.content or "")
                    success = True
                elif action.operation == "create":
                    await create_file(ctx, action.file_path, action.content or "")
                    success = True
                elif action.operation == "delete":
                    await delete_file(ctx, action.file_path)
                    success = True
                elif action.operation == "createDir":
                    await create_directory(ctx, action.file_path)
                    success = True
                elif action.operation == "removeDir":
                    await remove_directory(ctx, action.file_path)
                    success = True

                if success:
                    # Send webhook for successful action
                    async with self.webhook_service as webhook:
                        await webhook.send_action(
                            project_id=self.project_id,
                            action_type=action.operation,
                            path=action.file_path,
                            status="completed",
                        )

                    self.total_actions += 1

                    # Send completion update
                    yield {
                        "type": action.operation,
                        "file_path": action.file_path,
                        "message": action.reasoning,
                        "status": "completed",
                    }
                else:
                    raise Exception(f"Unknown operation: {action.operation}")

            except Exception as e:
                yield {
                    "type": "error",
                    "file_path": action.file_path,
                    "message": f"Failed to {action.operation}: {e}",
                    "status": "error",
                }
                return

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
