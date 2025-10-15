"""
Claude Code Service - Wrapper for claude-code-sdk agentic pipeline
"""

import logging
import os
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
from app.utils.token_counter import count_tokens

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

    def __init__(self, project_id: int, working_directory: str | None = None):
        self.project_id = project_id
        # Use session-specific working directory if provided, otherwise use main project path
        if working_directory:
            self.project_path = Path(working_directory)
        else:
            self.project_path = Path(settings.projects_dir) / str(project_id)

        # Track token usage manually since claude-code-sdk doesn't expose it
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_context_tokens = 0

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

        # Count input tokens only from user prompt (plain SDK usage)
        prompt_tokens = count_tokens(prompt)
        self.total_input_tokens += prompt_tokens

        logger.info(f"📊 Input tokens: {prompt_tokens}")

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
        """Setup claude-code options with minimal configuration (no custom prompt)."""
        all_tools = self._get_available_tools()

        options = ClaudeCodeOptions(
            cwd=str(self.project_path),
            allowed_tools=all_tools,
            permission_mode="acceptEdits",
            max_turns=max_turns,
        )

        self._log_options_config(options, all_tools)
        return options

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

        # Count output tokens from assistant response
        output_tokens = count_tokens(block.text)
        self.total_output_tokens += output_tokens
        logger.debug(f"📊 Added {output_tokens} output tokens")

        # Yield the complete text directly without streaming simulation
        if block.text.strip():
            yield {"type": "text", "text": block.text, "message_id": message_id}

    def _create_tool_start_event(self, block: ToolUseBlock, block_idx: int) -> dict[str, Any]:
        """Create tool start event from tool use block"""
        logger.info(f"🔧 Tool use block {block_idx}: {block.name} (id: {block.id})")
        logger.debug(f"🔧 Tool input: {str(block.input)[:200]}...")

        # Count tokens from tool input as part of the conversation
        tool_input_str = str(block.input)
        input_tokens = count_tokens(tool_input_str)
        self.total_input_tokens += input_tokens
        logger.debug(f"📊 Added {input_tokens} tokens from tool input")

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

        # Count tokens from tool result as input for the next model turn
        tool_result_str = str(block.content)
        result_tokens = count_tokens(tool_result_str)
        self.total_input_tokens += result_tokens
        logger.debug(f"📊 Added {result_tokens} tokens from tool result")

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

    def get_token_usage(self) -> dict[str, int]:
        """
        Get the total token usage for this session

        Returns:
            Dictionary with input_tokens, output_tokens, context_tokens, and total_tokens
        """
        total_tokens = self.total_input_tokens + self.total_output_tokens + self.total_context_tokens

        token_usage = {
            "input_tokens": self.total_input_tokens,
            "output_tokens": self.total_output_tokens,
            "context_tokens": self.total_context_tokens,
            "total_tokens": total_tokens,
        }

        logger.info(f"📊 Token usage summary: {token_usage}")
        return token_usage
