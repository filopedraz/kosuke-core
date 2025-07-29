import time
from collections.abc import AsyncGenerator

from app.core.actions import ActionExecutor
from app.models.actions import Action
from app.models.exceptions import AgentError
from app.models.exceptions import AgentErrorType
from app.models.exceptions import classify_error
from app.models.exceptions import get_error_message
from app.models.requests import ChatMessage
from app.services.fs_service import fs_service
from app.services.llm_service import llm_service
from app.services.webhook_service import WebhookService
from app.utils.config import settings
from app.utils.token_counter import count_tokens


class Agent:
    """
    Main Agent class responsible for orchestrating project modifications with streaming updates

    Mirrors the TypeScript Agent class from lib/llm/core/agent.ts
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self.max_iterations = settings.max_iterations
        self.action_executor = ActionExecutor(project_id)
        self.webhook_service = WebhookService()
        self.start_time = time.time()
        self.total_actions = 0
        self.total_tokens = 0
        print(f"🚀 Agent initialized for project ID: {project_id}")

    async def run(self, prompt: str) -> AsyncGenerator[dict, None]:
        """
        Main agent workflow with streaming updates

        Mirrors the TypeScript Agent.run method
        """
        print(f"🤖 Processing modification request for project ID: {self.project_id}")
        processing_start = time.time()

        try:
            # Get basic project context (simplified for now - will add full context service later)
            yield {
                "type": "thinking",
                "file_path": "",
                "message": "Analyzing project structure...",
                "status": "pending",
            }

            # Create a basic context for now
            context = await self._get_basic_context()

            # Run agentic workflow
            async for update in self._run_agentic_workflow(prompt, context):
                yield update

        except Exception as e:
            error_type = classify_error(e)
            yield {
                "type": "error",
                "file_path": "",
                "message": get_error_message(e, error_type),
                "status": "error",
                "error_type": error_type.value,
            }

        processing_end = time.time()
        print(f"⏱️ Total processing time: {processing_end - processing_start:.2f}s")

    async def _get_basic_context(self) -> str:
        """Get basic project context (placeholder for full context service)"""
        try:
            project_path = fs_service.get_project_path(self.project_id)
            if not project_path.exists():
                return "Project directory not found."

            # Get basic file listing
            files = await fs_service.list_files_recursively(str(project_path))

            return f"""
================================================================
Project Context
================================================================
Project ID: {self.project_id}
Project Path: {project_path}

Files ({len(files)} total):
{chr(10).join(files[:20])}  # Show first 20 files
{'...' if len(files) > 20 else ''}
================================================================
"""
        except Exception as e:
            print(f"Error getting basic context: {e}")
            return "Error loading project context"

    async def _run_agentic_workflow(self, prompt: str, context: str) -> AsyncGenerator[dict, None]:
        """
        Run the iterative agentic workflow

        Mirrors the TypeScript _runAgentic method from agent.ts
        """
        print(f"🔄 Running agentic workflow for project ID: {self.project_id}")

        iteration_count = 0
        read_files: set[str] = set()
        current_context = context
        execution_log: list[str] = []
        gathered_context: dict[str, str] = {}

        while iteration_count < self.max_iterations:
            iteration_count += 1

            yield {
                "type": "thinking",
                "file_path": "",
                "message": f"Thinking... (iteration {iteration_count})",
                "status": "pending",
            }

            try:
                # Update context with tracking info
                current_context = self._update_context_with_tracking(current_context, read_files, iteration_count)

                # Generate AI response
                messages = self._build_messages(prompt, current_context, [])
                response = await llm_service.generate_completion(messages)

                # Parse response
                parsed = await llm_service.parse_agent_response(response)

                if not parsed["thinking"]:
                    # Agent is ready to execute
                    yield {
                        "type": "thinking",
                        "file_path": "",
                        "message": "Ready to execute changes",
                        "status": "completed",
                    }

                    # Execute actions
                    async for update in self._execute_actions(parsed["actions"]):
                        yield update

                    # Send completion webhook
                    await self._send_completion_webhook(success=True)

                    return

                # Track duplicate read attempts for each file
                for action in parsed["actions"]:
                    if action.action == "read" and action.file_path in read_files:
                        print(f"⚠️ Duplicate read attempt for {action.file_path}")

                # Check for duplicate reads and force execution if needed
                if self._should_force_execution(parsed["actions"], read_files, iteration_count):
                    yield {
                        "type": "thinking",
                        "file_path": "",
                        "message": "Forcing execution mode",
                        "status": "pending",
                    }

                    final_actions = await self._force_execution_mode(prompt, current_context)
                    async for update in self._execute_actions(final_actions):
                        yield update

                    # Send completion webhook
                    await self._send_completion_webhook(success=True)

                    return

                # Execute read actions
                async for update in self._execute_read_actions(
                    parsed["actions"], read_files, gathered_context, execution_log
                ):
                    yield update

                # Update context
                current_context = self._update_context(current_context, gathered_context, execution_log)

            except Exception as e:
                print(f"Error in iteration {iteration_count}: {e}")
                # Add error to context and continue
                error_context = f"\n\n### ERROR IN PREVIOUS ITERATION:\n{e!s}\n\nPlease try a different approach.\n"
                current_context += error_context

        # Max iterations reached
        raise AgentError(
            AgentErrorType.PROCESSING,
            f"Reached maximum iterations ({self.max_iterations})",
            "The agent was unable to complete the task within the iteration limit",
        )

    async def _execute_actions(self, actions: list[Action]) -> AsyncGenerator[dict, None]:
        """
        Execute a list of actions and stream updates

        Mirrors the TypeScript executeActions functionality
        """
        print(f"🔄 Found {len(actions)} actions to execute")

        for i, action in enumerate(actions):
            print(f"⏳ Executing action {i+1}/{len(actions)}: {action.action} on {action.file_path}")

            # Map action type to update type (action.action is already a string due to use_enum_values=True)
            update_type = self._map_action_to_update_type(action.action)

            yield {"type": update_type, "file_path": action.file_path, "message": action.message, "status": "pending"}

            try:
                action_start = time.time()
                success = await self.action_executor.execute_action(action)
                action_end = time.time()

                status_msg = "succeeded" if success else "failed"
                duration = action_end - action_start
                print(f"{'✅' if success else '❌'} Action {i+1} execution {status_msg} in {duration:.2f}s")

                if success:
                    # Send webhook for successful action
                    async with self.webhook_service as webhook:
                        await webhook.send_action(
                            project_id=self.project_id,
                            action_type=action.action,  # Already a string due to use_enum_values=True
                            path=action.file_path,
                            status="completed",
                        )

                    self.total_actions += 1

                    yield {
                        "type": update_type,
                        "file_path": action.file_path,
                        "message": action.message,
                        "status": "completed",
                    }
                else:
                    # Send webhook for failed action
                    async with self.webhook_service as webhook:
                        await webhook.send_action(
                            project_id=self.project_id,
                            action_type=action.action,  # Already a string due to use_enum_values=True
                            path=action.file_path,
                            status="error",
                        )

                    yield {
                        "type": "error",
                        "file_path": action.file_path,
                        "message": f"Failed to {action.action} on {action.file_path}",
                        "status": "error",
                    }
                    return

            except Exception as e:
                yield {
                    "type": "error",
                    "file_path": action.file_path,
                    "message": f"Error executing {action.action}: {e!s}",
                    "status": "error",
                }
                return

        # Send completion message
        yield {
            "type": "completed",
            "file_path": "",
            "message": "All changes have been implemented successfully!",
            "status": "completed",
        }

    async def _execute_read_actions(
        self, actions: list[Action], read_files: set[str], gathered_context: dict[str, str], execution_log: list[str]
    ) -> AsyncGenerator[dict, None]:
        """
        Execute read actions and gather context

        Mirrors the TypeScript executeReadActionsForContext function
        """
        read_actions = [a for a in actions if a.action == "read"]  # action is already a string

        if not read_actions:
            print("No read actions to execute")
            return

        print(f"🧠 Agent is still in thinking mode, executing {len(read_actions)} read actions...")

        for action in read_actions:
            if action.file_path in read_files:
                print(f"⚠️ Skip reading already read file: {action.file_path}")
                continue

            read_files.add(action.file_path)
            execution_log.append(f"Read {action.file_path}")

            yield {"type": "read", "file_path": action.file_path, "message": action.message, "status": "pending"}

            try:
                project_path = fs_service.get_project_path(self.project_id)
                full_path = project_path / action.file_path

                content = await fs_service.read_file(str(full_path))

                # Count tokens for tracking
                file_tokens = count_tokens(content)
                print(f"📊 Read {action.file_path}: {file_tokens} tokens")

                gathered_context[action.file_path] = content

                yield {
                    "type": "read",
                    "file_path": action.file_path,
                    "message": f"Read {action.file_path} successfully ({file_tokens} tokens)",
                    "status": "completed",
                }

            except Exception as e:
                gathered_context[action.file_path] = f"Error: {e!s}"
                yield {
                    "type": "error",
                    "file_path": action.file_path,
                    "message": f"Error reading {action.file_path}: {e!s}",
                    "status": "error",
                }

    def _should_force_execution(self, actions: list[Action], read_files: set[str], iteration_count: int) -> bool:
        """Determine if we should force execution mode"""
        duplicate_reads = [
            a for a in actions if a.action == "read" and a.file_path in read_files
        ]  # action is already a string

        # Force execution after 2 duplicate reads or 15 iterations
        # Less aggressive now that users can see what the agent is thinking
        return len(duplicate_reads) >= 2 or iteration_count >= 15

    async def _force_execution_mode(self, prompt: str, context: str) -> list[Action]:
        """Force the agent into execution mode"""
        print("⚠️ Forcing agent to execution mode due to duplicate reads or high iteration count")

        forced_context = (
            context + "\n\n### SYSTEM NOTICE - FORCING EXECUTION MODE:\n"
            "You've attempted to reread files multiple times or have used too many iterations. "
            "Based on the files you've already read and the user's request, proceed to implementation immediately. "
            "Do not attempt to read any more files. Generate actual file modifications or creations now.\n"
            "The user's original request was: " + prompt + "\n"
        )

        messages = self._build_messages(prompt, forced_context, [])
        response = await llm_service.generate_completion(messages)
        parsed = await llm_service.parse_agent_response(response)

        return parsed["actions"]

    def _build_messages(self, prompt: str, context: str, chat_history: list) -> list[ChatMessage]:
        """Build messages for LLM completion"""
        system_content = context if context else ""

        return [ChatMessage(role="system", content=system_content), ChatMessage(role="user", content=prompt.strip())]

    def _update_context_with_tracking(self, context: str, read_files: set[str], iteration_count: int) -> str:
        """Update context with tracking information"""
        updated_context = context

        if read_files:
            files_section = "\n\n### Already Read Files - DO NOT READ THESE AGAIN:\n"
            files_section += "\n".join(f"{i+1}. {file}" for i, file in enumerate(read_files))
            updated_context += files_section

        if iteration_count >= int(self.max_iterations * 0.6):
            warning = (
                f"\n\n### WARNING - APPROACHING ITERATION LIMIT:\n"
                f"You have used {iteration_count} of {self.max_iterations} available iterations. "
                f"Move to implementation phase soon to avoid termination.\n"
            )
            updated_context += warning

        return updated_context

    def _update_context(self, context: str, gathered_context: dict[str, str], execution_log: list[str]) -> str:
        """Update context with gathered information"""
        updated_context = context

        if gathered_context:
            updated_context += "\n\n### File Contents:\n\n"
            for file_path, content in gathered_context.items():
                updated_context += f"--- File: {file_path} ---\n{content}\n\n"

        if execution_log:
            updated_context += "\n\n### Execution Log:\n\n"
            for i, log in enumerate(execution_log):
                updated_context += f"{i+1}. {log}\n"

        return updated_context

    def _map_action_to_update_type(self, action: str) -> str:
        """Map action type to stream update type"""
        mapping = {
            "read": "read",
            "create": "create",
            "edit": "edit",
            "delete": "delete",
            "createDir": "create",
            "removeDir": "delete",
            "search": "read",
        }
        return mapping.get(action, "unknown")

    async def _send_completion_webhook(self, success: bool = True):
        """Send completion webhook to Next.js"""
        try:
            duration = time.time() - self.start_time

            async with self.webhook_service as webhook:
                await webhook.send_completion(
                    project_id=self.project_id,
                    success=success,
                    total_actions=self.total_actions,
                    total_tokens=self.total_tokens,
                    duration=duration,
                )

            print(f"✅ Sent completion webhook: {self.total_actions} actions, {duration:.2f}s")
        except Exception as e:
            print(f"❌ Failed to send completion webhook: {e}")
