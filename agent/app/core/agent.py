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
                # NO result_type - this allows thinking blocks without tool_choice conflicts
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
        Main agent workflow with iterative task completion

        Continues working until the task is genuinely completed, not just after one iteration
        """
        print(f"🤖 Processing request for project ID: {self.project_id}")
        processing_start = time.time()
        
        max_iterations = 5  # Prevent infinite loops
        iteration = 0
        original_prompt = prompt
        
        try:
            yield {
                "type": "thinking_start",
                "file_path": "",
                "message": "Starting to think about your request...",
                "status": "pending",
            }

            # Main workflow loop - continue until task is completed or max iterations reached
            while iteration < max_iterations:
                iteration += 1
                print(f"🔄 Agent iteration {iteration}/{max_iterations}")
                
                yield {
                    "type": "text",
                    "file_path": "",
                    "message": f"\n🔄 Working on this task (iteration {iteration})...\n",
                    "status": "pending",
                }

                # Use PydanticAI's streaming capability to capture thinking blocks
                model_settings = {
                    "anthropic_thinking": {
                        "type": "enabled",
                        "budget_tokens": 2048,  # Allocate tokens for thinking
                    },
                    "max_tokens": 4096,
                    "temperature": 1.0,  # Required to be 1.0 when thinking is enabled
                }
                
                # On first iteration, use original prompt. On subsequent iterations, check completion
                if iteration == 1:
                    current_prompt = original_prompt
                else:
                    current_prompt = f"""Continue working on this task: {original_prompt}

Previous iterations have been completed. Please check if the task is fully completed.
If not, continue working on it. If it is completed, provide a final summary.

Focus on:
1. Verifying the task requirements are met
2. Making any remaining necessary changes
3. Confirming everything is working as expected"""

                async with self.agent.run_stream(current_prompt, deps=self.project_id, model_settings=model_settings) as result:
                    text_content = ""
                    tool_calls_made = False

                    # Stream text content (includes thinking blocks when enabled)
                    async for text_chunk in result.stream(debounce_by=0.01):
                        text_content += text_chunk
                        yield {
                            "type": "text",
                            "file_path": "",
                            "message": text_chunk,
                            "status": "pending",
                        }

                    # Check if tools were used by looking at new messages
                    for message in result.new_messages():
                        for part in message.parts:
                            if hasattr(part, "tool_name"):  # Tool call detected
                                tool_calls_made = True
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
                                yield {
                                    "type": "operation_start",
                                    "file_path": file_path,
                                    "message": f"Executing {part.tool_name}...",
                                    "operation": part.tool_name,
                                    "status": "pending",
                                }

                                # Also yield operation complete for this tool
                                yield {
                                    "type": "operation_complete",
                                    "file_path": file_path,
                                    "message": f"Completed {part.tool_name}",
                                    "operation": part.tool_name,
                                    "status": "completed",
                                }

                # Check if this iteration suggests the task is complete
                # If no tools were used and the response indicates completion, we can stop
                if not tool_calls_made and iteration > 1:
                    # Check if the response indicates task completion
                    completion_indicators = ["completed", "finished", "done", "task is complete", "successfully implemented"]
                    if any(indicator in text_content.lower() for indicator in completion_indicators):
                        print(f"✅ Task appears completed after iteration {iteration}")
                        break
                
                # Continue to next iteration if we used tools or this is the first iteration
                if tool_calls_made or iteration == 1:
                    yield {
                        "type": "text",
                        "file_path": "",
                        "message": f"\n✅ Iteration {iteration} completed. Checking if more work is needed...\n",
                        "status": "pending",
                    }
                    continue
                else:
                    # No tools used and not first iteration - likely done
                    break

            # Show completion message
            completion_msg = f"Task completed after {iteration} iteration(s)"
            if iteration >= max_iterations:
                completion_msg += f" (reached maximum iterations)"
            completion_msg += "!"

            # Send completion
            yield {
                "type": "completed",
                "file_path": "",
                "message": completion_msg,
                "status": "completed",
            }

            # Send completion webhook
            await self._send_completion_webhook(success=True)

        except Exception as e:
            error_msg = f"Error in modern agent: {e}"
            print(f"❌ {error_msg}")

            # Try fallback to non-streaming approach
            try:
                model_settings = {
                    "anthropic_thinking": {
                        "type": "enabled",
                        "budget_tokens": 2048,  # Allocate tokens for thinking
                    },
                    "max_tokens": 4096,
                    "temperature": 1.0,  # Required to be 1.0 when thinking is enabled
                }
                result = await self.agent.run(prompt, deps=self.project_id, model_settings=model_settings)

                # Handle fallback result - just get the text response
                if result and result.data:
                    yield {
                        "type": "text",
                        "file_path": "",
                        "message": str(result.data),
                        "status": "pending",
                    }

                yield {
                    "type": "completed",
                    "file_path": "",
                    "message": "Response completed via fallback method!",
                    "status": "completed",
                }
            except Exception as fallback_error:
                yield {
                    "type": "error",
                    "file_path": "",
                    "message": f"Agent error: {fallback_error}",
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
        """Execute structured actions from Pydantic AI response with operation events"""
        print(f"🔄 Executing {len(actions)} structured actions")

        for i, action in enumerate(actions):
            print(f"⏳ Executing action {i+1}/{len(actions)}: {action.operation} on {action.file_path}")

            # Send operation start event
            yield {
                "type": "operation_start",
                "file_path": action.file_path,
                "message": f"Starting {action.operation} operation",
                "status": "pending",
                "operation": action.operation,
            }

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

                    # Send operation completion event
                    yield {
                        "type": "operation_complete",
                        "file_path": action.file_path,
                        "message": action.reasoning,
                        "status": "completed",
                        "operation": action.operation,
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
