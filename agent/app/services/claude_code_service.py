"""
Claude Code Service - Wrapper for claude-code-sdk agentic pipeline
"""
import asyncio
import logging
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from claude_code_sdk import AssistantMessage
from claude_code_sdk import ClaudeCodeOptions
from claude_code_sdk import ClaudeSDKError
from claude_code_sdk import CLINotFoundError
from claude_code_sdk import ProcessError
from claude_code_sdk import TextBlock
from claude_code_sdk import ToolResultBlock
from claude_code_sdk import ToolUseBlock
from claude_code_sdk import UserMessage
from claude_code_sdk import query

from app.utils.config import settings

logger = logging.getLogger(__name__)


class ClaudeCodeService:
    """
    Service for using claude-code-sdk with agentic capabilities

    This service provides:
    - All available Claude Code tools (Task, Bash, Glob, Grep, LS, ExitPlanMode,
      Read, Edit, MultiEdit, Write, NotebookRead, NotebookEdit, WebFetch, TodoWrite, WebSearch)
    - Project-based working directory isolation
    - Comprehensive debugging logs
    - Smart task routing and execution

    Note:
    - Model selection is handled by the Claude Code CLI configuration, not the Python SDK
    - Project directories must exist before using this service (no auto-creation)
    - Supports up to 25 conversation turns by default
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        # Use consistent project path with other services
        self.project_path = Path(settings.projects_dir) / str(project_id)

        logger.info(f"🚀 Initializing Claude Code Service for project {project_id}")
        logger.info(f"📁 Project path: {self.project_path}")
        logger.info(f"⚙️ Settings projects_dir: {settings.projects_dir}")

        # Check that project directory exists - DO NOT create it if missing
        if not self.project_path.exists():
            error_msg = f"❌ Project directory does not exist: {self.project_path}"
            logger.error(error_msg)
            raise FileNotFoundError(
                f"Project directory not found: {self.project_path}. "
                "Projects must be created before using Claude Code service."
            )

        # Log project directory status
        files_count = len(list(self.project_path.rglob("*")))
        logger.info(f"✅ Project directory exists with {files_count} files/folders")

        # Log directory contents for debugging
        try:
            contents = list(self.project_path.iterdir())[:10]  # Limit to first 10 items
            if contents:
                logger.info(f"📂 Directory contents: {[str(p.name) for p in contents]}")
            else:
                logger.warning("⚠️ Project directory is empty!")
        except Exception as e:
            logger.error(f"❌ Failed to list directory contents: {e}")
            raise

    async def _simulate_text_streaming(self, text: str, message_id: str) -> AsyncGenerator[dict[str, Any], None]:
        """
        Simulate streaming by splitting text into words and yielding them progressively

        Args:
            text: Complete text to stream
            message_id: Message identifier

        Yields:
            Streaming text events
        """
        if not text.strip():
            return

        # Split text into words while preserving spacing
        words = text.split(" ")
        current_chunk = ""

        for i, word in enumerate(words):
            # Add word to current chunk
            if current_chunk:
                current_chunk += " " + word
            else:
                current_chunk = word

            # Yield chunk every 2-4 words or at punctuation
            should_yield = (
                i > 0
                and (i + 1) % 3 == 0  # Every 3 words
                or word.endswith((".", "!", "?", ";", ":", "\n"))  # At sentence boundaries and line breaks
                or i == len(words) - 1  # Last word
            )

            if should_yield:
                yield {"type": "text", "text": current_chunk, "message_id": message_id}
                current_chunk = ""

                # Small delay to simulate streaming (adjust as needed)
                await asyncio.sleep(0.05)  # 50ms delay between chunks

    def _get_cursor_rules(self) -> str:
        """
        Fetch cursor rules from .cursor/rules/general.mdc if it exists
        """
        try:
            cursor_rules_path = self.project_path / ".cursor" / "rules" / "general.mdc"
            logger.debug(f"🔍 Looking for cursor rules at: {cursor_rules_path}")

            if cursor_rules_path.exists():
                rules_content = cursor_rules_path.read_text(encoding="utf-8")
                logger.info(f"📋 Found cursor rules ({len(rules_content)} chars)")

                return f"""
================================================================
Project Guidelines & Cursor Rules
================================================================
{rules_content}
================================================================
"""

            logger.debug("📋 No cursor rules file found")
            return ""
        except Exception as e:
            logger.warning(f"⚠️ Could not load cursor rules: {e}")
            return ""

    async def run_agentic_query(self, prompt: str, max_turns: int = 25) -> AsyncGenerator[dict[str, Any], None]:
        """
        Run a query using the claude-code agentic pipeline with a single agent

        Args:
            prompt: The user prompt/query
            max_turns: Maximum number of conversation turns

        Yields:
            Stream of events from the agentic pipeline
        """
        logger.info(f"🎯 Starting Claude Code agentic query for project {self.project_id}")
        logger.info(f"📝 Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
        logger.info(f"🔄 Max turns: {max_turns}")
        logger.info(f"📁 Working directory: {self.project_path}")

        try:
            # Setup options and run query
            options = self._setup_claude_code_options(max_turns)
            async for event in self._stream_query_events(prompt, options):
                yield event

        except (CLINotFoundError, ProcessError, ClaudeSDKError) as e:
            async for error_event in self._handle_known_error(e):
                yield error_event
        except Exception as e:
            async for error_event in self._handle_unexpected_error(e):
                yield error_event

    def _setup_claude_code_options(self, max_turns: int) -> ClaudeCodeOptions:
        """Setup claude-code options with system prompt and tools"""
        system_prompt = self._build_system_prompt()
        all_tools = self._get_available_tools()

        options = ClaudeCodeOptions(
            cwd=str(self.project_path),
            allowed_tools=all_tools,
            permission_mode="acceptEdits",
            max_turns=max_turns,
            system_prompt=system_prompt,
        )

        self._log_options_config(options, all_tools)
        return options

    def _build_system_prompt(self) -> str:
        """Build the complete system prompt with cursor rules"""
        base_system_prompt = (
            "You are an expert software development assistant working on a Kosuke template project."
            "\n\n"
            "You can:\n\n"
            "- Analyze code structure, architecture, and quality\n"
            "- Read, create, modify, and organize files and directories\n"
            "- Generate high-quality code following best practices\n"
            "- Debug issues and provide solutions\n"
            "- Implement features and improvements\n"
            "- Work with Next.js, React, TypeScript, and modern web technologies\n\n"
            "You have access to tools to read files, write files, run bash commands, and search through code.\n"
            "Tool execution is handled automatically - when you decide to use a tool like Read, Write, or Bash,\n"
            "it will be executed automatically and the results will be provided to you.\n\n"
            "Be thorough in your analysis and make thoughtful, well-reasoned changes.\n"
            "Always explain your reasoning and provide clear documentation for any modifications."
        )

        cursor_rules = self._get_cursor_rules()
        system_prompt_parts = [base_system_prompt]

        if cursor_rules:
            system_prompt_parts.append(cursor_rules)
            logger.info("📋 Added cursor rules to system prompt")

        system_prompt = "\n\n".join(system_prompt_parts)
        logger.info(f"📋 System prompt length: {len(system_prompt)} characters")
        return system_prompt

    def _get_available_tools(self) -> list[str]:
        """Get list of all available tools"""
        return [
            "Task",
            "Bash",
            "Glob",
            "Grep",
            "LS",
            "ExitPlanMode",
            "Read",
            "Edit",
            "MultiEdit",
            "Write",
            "NotebookRead",
            "NotebookEdit",
            "WebFetch",
            "TodoWrite",
            "WebSearch",
        ]

    def _log_options_config(self, options: ClaudeCodeOptions, all_tools: list[str]):
        """Log the options configuration"""
        logger.info("⚙️ Claude Code options configured:")
        logger.info(f"  📁 CWD: {options.cwd}")
        logger.info(f"  🔧 Tools ({len(all_tools)}): {all_tools}")
        logger.info(f"  🔐 Permission mode: {options.permission_mode}")
        logger.info(f"  🔄 Max turns: {options.max_turns}")

        import os

        current_model = os.getenv("ANTHROPIC_MODEL", "default")
        logger.info(f"🤖 Model (from env): {current_model}")
        logger.info("📝 Note: Model is configured globally in Claude Code CLI via ANTHROPIC_MODEL env var")

    async def _stream_query_events(
        self, prompt: str, options: ClaudeCodeOptions
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Stream events from the agentic query"""
        logger.info("🚀 Starting Claude Code query stream...")
        message_count = 0

        async for message in query(prompt=prompt, options=options):
            message_count += 1
            logger.debug(f"📨 Received message {message_count}: {type(message).__name__}")

            async for event in self._process_message(message, message_count):
                yield event

        logger.info(f"✅ Processed {message_count} messages from Claude Code stream")

    async def _process_message(self, message: Any, message_count: int) -> AsyncGenerator[dict[str, Any], None]:
        """Process a single message from the query stream"""
        if isinstance(message, AssistantMessage):
            async for event in self._process_assistant_message(message):
                yield event
        elif isinstance(message, UserMessage):
            async for event in self._process_user_message(message):
                yield event
        else:
            logger.debug(f"📤 Other message type: {type(message).__name__}")
            logger.debug(f"📤 Message content preview: {str(message)[:200]}...")
            yield {"type": "message", "message": str(message)}

    async def _process_assistant_message(self, message: AssistantMessage) -> AsyncGenerator[dict[str, Any], None]:
        """Process assistant message content"""
        logger.debug(f"🤖 Processing AssistantMessage with {len(message.content)} blocks")

        for block_idx, block in enumerate(message.content):
            if isinstance(block, TextBlock):
                async for event in self._process_text_block(block, message, block_idx):
                    yield event
            elif isinstance(block, ToolUseBlock):
                yield self._create_tool_start_event(block, block_idx)
            else:
                logger.debug(f"❓ Unknown block type {block_idx}: {type(block).__name__}")

    async def _process_text_block(
        self, block: TextBlock, message: AssistantMessage, block_idx: int
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Process a text block from assistant message"""
        logger.debug(f"📝 Text block {block_idx}: {len(block.text)} chars")
        message_id = getattr(message, "id", None) or f"msg_{abs(hash(str(message)))}"

        async for text_event in self._simulate_text_streaming(block.text, message_id):
            yield text_event

    def _create_tool_start_event(self, block: ToolUseBlock, block_idx: int) -> dict[str, Any]:
        """Create tool start event from tool use block"""
        logger.info(f"🔧 Tool use block {block_idx}: {block.name} (id: {block.id})")
        logger.debug(f"🔧 Tool input: {str(block.input)[:200]}...")

        return {
            "type": "tool_start",
            "tool_name": block.name,
            "tool_input": block.input,
            "tool_id": block.id,
        }

    async def _process_user_message(self, message: UserMessage) -> AsyncGenerator[dict[str, Any], None]:
        """Process user message content"""
        logger.debug(f"👤 Processing UserMessage with {len(message.content)} blocks")

        for block_idx, block in enumerate(message.content):
            if isinstance(block, ToolResultBlock):
                yield self._create_tool_stop_event(block, block_idx)
            else:
                logger.debug(f"📤 User message block {block_idx}: {type(block).__name__}")
                yield {"type": "message", "message": str(block)}

    def _create_tool_stop_event(self, block: ToolResultBlock, block_idx: int) -> dict[str, Any]:
        """Create tool stop event from tool result block"""
        logger.info(f"✅ Tool result block {block_idx}: tool_use_id={block.tool_use_id}")
        logger.debug(f"✅ Tool result content: {str(block.content)[:200]}...")

        return {
            "type": "tool_stop",
            "tool_id": block.tool_use_id,
            "tool_result": block.content,
            "is_error": getattr(block, "is_error", False),
        }

    async def _handle_known_error(self, error: Exception) -> AsyncGenerator[dict[str, Any], None]:
        """Handle known errors (CLI, Process, SDK)"""
        if isinstance(error, CLINotFoundError):
            error_msg = "Claude Code CLI not found. Please install: npm install -g @anthropic-ai/claude-code"
            logger.error(f"❌ {error_msg}")
            logger.error(f"❌ CLINotFoundError details: {error}")
        elif isinstance(error, ProcessError):
            error_msg = f"Process failed with exit code {error.exit_code}: {error}"
            logger.error(f"❌ ProcessError: {error_msg}")
            logger.error(f"❌ Exit code: {error.exit_code}")
        elif isinstance(error, ClaudeSDKError):
            error_msg = f"Claude SDK error: {error}"
            logger.error(f"❌ ClaudeSDKError: {error_msg}")
            logger.error(f"❌ SDK error type: {type(error).__name__}")
        else:
            error_msg = str(error)

        yield {"type": "error", "message": error_msg}

    async def _handle_unexpected_error(self, error: Exception) -> AsyncGenerator[dict[str, Any], None]:
        """Handle unexpected errors"""
        error_msg = f"Unexpected error in agentic pipeline: {error}"
        logger.error(f"❌ Unexpected error: {error_msg}")
        logger.error(f"❌ Error type: {type(error).__name__}")
        logger.exception("❌ Full error traceback:")
        yield {"type": "error", "message": error_msg}

    def get_project_context(self) -> dict[str, Any]:
        """
        Get context information about the current project

        Returns:
            Project context including file structure
        """
        logger.info(f"📊 Getting project context for project {self.project_id}")

        try:
            project_files = [str(f) for f in self.project_path.rglob("*") if f.is_file()]

            context = {
                "project_id": self.project_id,
                "project_path": str(self.project_path),
                "project_files": project_files,
            }

            logger.info(f"📊 Project context: {len(project_files)} files found")
            if project_files:
                logger.debug(f"📊 Sample files: {project_files[:5]}")
            else:
                logger.warning("⚠️ No files found in project directory!")

            return context

        except Exception as e:
            logger.error(f"❌ Failed to get project context: {e}")
            return {
                "project_id": self.project_id,
                "project_path": str(self.project_path),
                "project_files": [],
                "error": str(e),
            }
