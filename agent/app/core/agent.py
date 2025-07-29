import json
import os
import re
import time
from collections.abc import AsyncGenerator
from typing import Any

from pydantic_ai import Agent as PydanticAgent
from pydantic_ai.models.anthropic import AnthropicModel

from app.core.actions import ActionExecutor
from app.models.actions import Action
from app.models.exceptions import AgentError
from app.models.exceptions import AgentErrorType
from app.models.exceptions import classify_error
from app.models.exceptions import get_error_message
from app.models.requests import ChatMessage
from app.services.fs_service import fs_service
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

        # Initialize PydanticAI directly with project context
        self._initialize_llm()

        print(f"🚀 Agent initialized for project ID: {project_id}")

    def _initialize_llm(self):
        """Initialize PydanticAI agent with project-specific context"""
        try:
            # Set the API key as environment variable for PydanticAI
            if settings.anthropic_api_key:
                os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key

            self.model = AnthropicModel(settings.model_name)

            # Get project context during initialization
            project_context = self._get_basic_context_sync()
            print(f"📋 Initialized agent with project context ({len(project_context)} chars)")

            # Create PydanticAI agent with complete system prompt (instructions + project context)
            system_prompt = self._build_complete_system_prompt(project_context)
            self.pydantic_agent = PydanticAgent(
                model=self.model,
                system_prompt=system_prompt,
                instrument=True,  # Enable OpenTelemetry instrumentation for Langfuse
            )

            print("🎯 LLM integration initialized successfully")
        except Exception as e:
            print(f"⚠️ Failed to initialize LLM: {e}")
            raise

    def _build_complete_system_prompt(self, project_context: str) -> str:
        """Build the complete system prompt with base instructions and project context"""
        base_prompt = self._get_base_system_prompt()

        if project_context:
            return f"{base_prompt}\n\n{project_context}"
        else:
            return base_prompt

    def _get_base_system_prompt(self) -> str:
        """
        Get the base system prompt for the agent (without project context)

        Mirrors the NAIVE_SYSTEM_PROMPT from lib/llm/core/prompts.ts
        """
        return """You are an expert senior software engineer specializing in modern web development,
with deep expertise in TypeScript, React 19, Next.js 15 (without ./src/ directory and using the App Router),
Vercel AI SDK, Shadcn UI, Radix UI, and Tailwind CSS.

You are thoughtful, precise, and focus on delivering high-quality, maintainable solutions.

Your job is to help users modify their project based on the user requirements.

### Features availability
- As of now you can only implement frontend/client-side code. No APIs or Database changes.
  If you can't implement the user request because of this, just say so.
- You cannot add new dependencies or libraries. As of now you don't have access to the terminal
  in order to install new dependencies.

### HOW YOU SHOULD WORK - CRITICAL INSTRUCTIONS:
1. FIRST, understand what files you need to see by analyzing the project structure provided
2. READ those files using the read tool to understand the codebase
3. ONLY AFTER gathering sufficient context, propose and implement changes
4. When implementing changes, break down complex tasks into smaller actions

### FILE READING BEST PRACTICES - EXTREMELY IMPORTANT:
1. AVOID REREADING FILES you've already examined - maintain awareness of files you've already read
2. PLAN your file reads upfront - make a list of all potentially relevant files before reading any
3. Prioritize reading STRUCTURAL files first (layouts, main pages) before component files
4. READ ALL NECESSARY FILES at once before starting to implement changes
5. If you read a UI component file (Button, Input, etc.), REMEMBER its API - don't read it again
6. Include clear REASONS why you need to read each file in your message
7. Once you've read 5-8 files, ASSESS if you have enough context to implement the changes
8. TRACK what you've learned from each file to avoid redundant reading
9. If you find yourself wanting to read the same file again, STOP and move to implementation
10. Keep track of the files you've already read to prevent infinite read loops

### AVAILABLE TOOLS - READ CAREFULLY

You have access to the following tools:

- read(filePath: string) - Read the contents of a file to understand existing code before making changes
- edit(filePath: string, content: string) - Edit a file
- create(filePath: string, content: string) - Create a new file
- delete(filePath: string) - Delete a file
- createDir(path: string) - Create a new directory
- removeDir(path: string) - Remove a directory and all its contents

### ‼️ CRITICAL: RESPONSE FORMAT ‼️

🚨 ABSOLUTELY CRITICAL: Your response must be EXACTLY ONE JSON object. NO EXCEPTIONS. 🚨

NEVER return multiple JSON objects. NEVER return two separate responses.
Your ENTIRE response must be a single valid JSON object - nothing before, nothing after, no additional content.

Your responses can be in one of two formats:

1. THINKING/READING MODE: When you need to examine files or think through a problem:
{
  "thinking": true,
  "actions": [
    {
      "action": "read",
      "filePath": "path/to/file.ts",
      "message": "I need to examine this file to understand its structure"
    }
  ]
}

2. EXECUTION MODE: When ready to implement changes:
{
  "thinking": false,
  "actions": [
    {
      "action": "edit",
      "filePath": "components/Button.tsx",
      "content": "import React from 'react';\\n\\nexport default () => <button>Click me</button>;",
      "message": "I need to update the Button component to add the onClick prop"
    }
  ]
}

🚨 JSON FORMATTING RULES - FOLLOW EXACTLY: 🚨
1. Your ENTIRE response must be a single valid JSON object - no other text before or after.
2. Do NOT wrap your response in backticks or code blocks. Return ONLY the raw JSON.
3. Do NOT return multiple JSON objects separated by newlines. ONLY ONE JSON object.
4. Every string MUST have correctly escaped characters:
   - Use \\n for newlines (not actual newlines)
   - Use \\" for quotes inside strings (not " or ')
   - Use \\\\ for backslashes
5. Each action MUST have these properties:
   - action: "read" | "edit" | "create" | "delete" | "createDir" | "removeDir"
   - filePath: string - path to the file or directory
   - content: string - required for edit and create actions
   - message: string - IMPORTANT: Write messages in future tense starting with "I need to..."
     describing what the action will do, NOT what it has already done.
6. For edit actions, ALWAYS return the COMPLETE file content after your changes.
7. Verify your JSON is valid before returning it - invalid JSON will cause the entire request to fail.

🚨 EXAMPLES OF WHAT NOT TO DO: 🚨
❌ WRONG - Multiple JSON objects:
{"thinking": true, "actions": [...]}
{"thinking": false, "actions": [...]}

❌ WRONG - Text before JSON:
I need to read the file first.
{"thinking": true, "actions": [...]}

❌ WRONG - Code blocks:
```json
{"thinking": true, "actions": [...]}
```

✅ CORRECT - Single JSON object only:
{"thinking": true, "actions": [...]}

IMPORTANT: The system can ONLY execute actions from the JSON object.
Any instructions or explanations outside the JSON will be ignored."""

    async def generate_completion(
        self, messages: list[ChatMessage], temperature: float | None = None, max_tokens: int | None = None
    ) -> str:
        """
        Generate a completion using Claude 3.5 Sonnet

        Mirrors the TypeScript generateAICompletion function
        """

        temperature = temperature or settings.temperature
        max_tokens = max_tokens or settings.max_tokens

        print("🤖 Using Claude 3.5 Sonnet for completion")
        print(f"📊 Request parameters: temperature={temperature}, maxTokens={max_tokens}")

        # Convert messages to user message (no system context needed, it's in the agent's system prompt)
        user_message = ""
        conversation = []

        for msg in messages:
            if msg.role == "system":
                # System messages are now handled by the agent's system prompt
                continue
            elif msg.role == "user":
                # Combine multiple user messages if present
                if user_message:
                    user_message += f"\n\n{msg.content}"
                else:
                    user_message = msg.content
            else:
                conversation.append({"role": msg.role, "content": msg.content})

        try:
            print(f"Formatted message count: {len(conversation) + 1}")

            # Use PydanticAI agent to generate completion
            result = await self.pydantic_agent.run(user_message)

            response_text = result.data if hasattr(result, "data") else str(result)

            # Log token usage if available
            if hasattr(result, "usage"):
                usage = result.usage
                print(f"📊 Token usage: {usage}")

            print(f"✅ Generated completion: {len(response_text)} characters")
            return response_text

        except Exception as e:
            print(f"❌ Error generating completion: {e}")
            raise

    async def parse_agent_response(self, response: str) -> dict[str, Any]:
        """
        Parse the agent response into thinking state and actions

        Mirrors the TypeScript parseAgentResponse function from agentPromptParser.ts
        """
        try:
            # Handle if response is an object with text property (shouldn't happen with our setup)
            response_text = response if isinstance(response, str) else str(response)

            # Clean up the response - remove markdown code blocks if present
            cleaned_response = response_text.strip()
            cleaned_response = re.sub(r"```(?:json)?[\r\n]?(.*?)[\r\n]?```", r"\1", cleaned_response, flags=re.DOTALL)
            cleaned_response = cleaned_response.strip()

            preview = cleaned_response[:200] + ("..." if len(cleaned_response) > 200 else "")
            print(f"📝 Cleaned response (preview): {preview}")

            # Default values for the result
            result = {
                "thinking": True,  # Default to thinking mode
                "actions": [],
            }

            try:
                # Parse the response as JSON
                parsed_response = json.loads(cleaned_response)
                return self._process_parsed_response(parsed_response, result)

            except json.JSONDecodeError as json_error:
                self._log_json_parse_error(json_error, cleaned_response)
                raise Exception(f"Failed to parse JSON response from LLM: {json_error!s}") from json_error

        except Exception as error:
            print(f"❌ Error parsing agent response: {error}")
            raise Exception(f"Error processing agent response: {error!s}") from error

    def _process_parsed_response(self, parsed_response: dict, result: dict) -> dict[str, Any]:
        """Process the parsed JSON response and extract thinking state and actions"""
        # Set thinking state if provided
        if isinstance(parsed_response, dict) and "thinking" in parsed_response:
            result["thinking"] = bool(parsed_response["thinking"])

        # Parse actions if provided
        if isinstance(parsed_response, dict) and "actions" in parsed_response:
            if isinstance(parsed_response["actions"], list):
                action_count = len(parsed_response["actions"])
                print(f"✅ Successfully parsed JSON: {action_count} potential actions found")

                # Validate each action and add to result
                valid_actions = self._validate_actions(parsed_response["actions"])
                result["actions"] = valid_actions
                print(f"✅ Found {len(result['actions'])} valid actions")
            else:
                print("⚠️ Response parsed as JSON but actions is not an array")
        else:
            print("⚠️ Response parsed as JSON but no actions field found")

        return result

    def _validate_actions(self, actions_data: list) -> list[Action]:
        """Validate and convert action data to Action objects"""
        valid_actions = []
        for idx, action_data in enumerate(actions_data):
            try:
                if isinstance(action_data, dict):
                    action = Action(**action_data)
                    valid_actions.append(action)
                else:
                    print(f"⚠️ Invalid action at index {idx}: not a dict")
            except Exception as e:
                print(f"⚠️ Invalid action at index {idx}: {e}")
        return valid_actions

    def _log_json_parse_error(self, json_error: json.JSONDecodeError, cleaned_response: str):
        """Log JSON parsing errors with helpful context"""
        print(f"❌ Error parsing JSON: {json_error}")

        # Show context around the error if possible
        if hasattr(json_error, "pos") and json_error.pos is not None:
            error_pos = json_error.pos
            start = max(0, error_pos - 30)
            end = min(len(cleaned_response), error_pos + 30)

            context = f"...{cleaned_response[start:error_pos]}[ERROR]{cleaned_response[error_pos:end]}..."
            print(f"⚠️ JSON error at position {error_pos}. Context around error:")
            print(f"Error context: {context}")

    def _get_basic_context_sync(self) -> str:
        """Get basic project context synchronously for initialization"""
        try:
            project_path = fs_service.get_project_path(self.project_id)
            if not project_path.exists():
                return "Project directory not found."

            # Get directory structure (already synchronous)
            directory_structure = fs_service.get_project_files_sync(self.project_id)

            # Helper function to format directory structure as a tree
            def format_structure(nodes, prefix="", is_last=True):
                lines = []
                for i, node in enumerate(nodes):
                    is_last_item = i == len(nodes) - 1

                    # Choose the right tree symbols
                    if prefix == "":  # Root level
                        current_prefix = ""
                        next_prefix = ""
                    else:
                        current_prefix = prefix + ("└── " if is_last_item else "├── ")
                        next_prefix = prefix + ("    " if is_last_item else "│   ")

                    if node["type"] == "directory":
                        lines.append(f"{current_prefix}{node['name']}/")
                        if "children" in node and node["children"]:
                            lines.extend(format_structure(node["children"], next_prefix, is_last_item))
                    else:
                        lines.append(f"{current_prefix}{node['name']}")

                return lines

            structure_lines = format_structure(directory_structure)
            structure_text = "\n".join(structure_lines) if structure_lines else "No files found"

            return f"""
================================================================
Project Context
================================================================
Project ID: {self.project_id}
Project Path: {project_path}

Project Structure:
{structure_text}
================================================================
"""
        except Exception as e:
            print(f"Error getting basic context: {e}")
            return "Error loading project context"

    async def run(self, prompt: str) -> AsyncGenerator[dict, None]:
        """
        Main agent workflow with streaming updates

        Mirrors the TypeScript Agent.run method
        """
        print(f"🤖 Processing modification request for project ID: {self.project_id}")
        processing_start = time.time()

        try:
            # Agent already has project context in its system prompt
            yield {
                "type": "thinking",
                "file_path": "",
                "message": "Agent ready with project context...",
                "status": "pending",
            }

            # Run agentic workflow (no need to pass context)
            async for update in self._run_agentic_workflow(prompt):
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
        """Get basic project context with directory structure and file listing"""
        # This method is now only used for legacy compatibility
        # The context is already included in the LLM service's system prompt
        return f"Project context already loaded for project ID: {self.project_id}"

    async def _run_agentic_workflow(self, prompt: str) -> AsyncGenerator[dict, None]:
        """
        Run the iterative agentic workflow

        Mirrors the TypeScript _runAgentic method from agent.ts
        """
        print(f"🔄 Running agentic workflow for project ID: {self.project_id}")

        iteration_count = 0
        read_files: set[str] = set()
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
                # Build context with tracking info (no project context needed, it's in system prompt)
                current_context = self._build_iteration_context(
                    read_files, iteration_count, gathered_context, execution_log
                )

                # Generate AI response
                messages = self._build_messages(prompt, current_context)
                response = await self.generate_completion(messages)

                # Parse response
                parsed = await self.parse_agent_response(response)

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

        messages = self._build_messages(prompt, forced_context)
        response = await self.generate_completion(messages)
        parsed = await self.parse_agent_response(response)

        return parsed["actions"]

    def _build_messages(self, prompt: str, iteration_context: str = "") -> list[ChatMessage]:
        """Build messages for LLM completion"""
        messages = []

        # Add iteration context as user message if present
        if iteration_context:
            messages.append(ChatMessage(role="user", content=f"ITERATION CONTEXT:\n{iteration_context}"))

        # Add main user prompt
        messages.append(ChatMessage(role="user", content=prompt.strip()))

        return messages

    def _build_iteration_context(
        self, read_files: set[str], iteration_count: int, gathered_context: dict[str, str], execution_log: list[str]
    ) -> str:
        """Build context for current iteration with tracking information"""
        context_parts = []

        if read_files:
            files_section = "\n### Already Read Files - DO NOT READ THESE AGAIN:\n"
            files_section += "\n".join(f"{i+1}. {file}" for i, file in enumerate(read_files))
            context_parts.append(files_section)

        if iteration_count >= int(self.max_iterations * 0.6):
            warning = (
                f"\n### WARNING - APPROACHING ITERATION LIMIT:\n"
                f"You have used {iteration_count} of {self.max_iterations} available iterations. "
                f"Move to implementation phase soon to avoid termination.\n"
            )
            context_parts.append(warning)

        if gathered_context:
            context_parts.append("\n### File Contents:\n")
            for file_path, content in gathered_context.items():
                context_parts.append(f"--- File: {file_path} ---\n{content}\n")

        if execution_log:
            context_parts.append("\n### Execution Log:\n")
            for i, log in enumerate(execution_log):
                context_parts.append(f"{i+1}. {log}")

        return "\n".join(context_parts)

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
