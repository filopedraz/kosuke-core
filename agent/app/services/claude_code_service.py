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

# Add Langfuse import
from langfuse import get_client

from app.utils.config import settings
from app.utils.token_counter import count_tokens

logger = logging.getLogger(__name__)

# Get Langfuse client instance
langfuse = get_client()


class ClaudeCodeService:
    """
    Service for using claude-code-sdk with agentic capabilities

    This service provides:
    - All available Claude Code tools (Task, Bash, Glob, Grep, LS, ExitPlanMode,
      Read, Edit, MultiEdit, Write, NotebookRead, NotebookEdit, WebFetch, TodoWrite, WebSearch)
    - Project-based working directory isolation
    - Comprehensive debugging logs
    - Smart task routing and execution
    - Langfuse observability integration

    Note:
    - Model selection is handled by the Claude Code CLI configuration, not the Python SDK
    - Project directories must exist before using this service (no auto-creation)
    - Supports up to 25 conversation turns by default
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        # Use consistent project path with other services
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

        # Create Langfuse trace for this query
        trace = langfuse.trace(
            name="claude-code-agentic-query",
            input={"prompt": prompt, "max_turns": max_turns, "project_id": self.project_id},
            metadata={
                "project_path": str(self.project_path),
                "service": "claude-code-sdk",
                "model": "claude-3-7-sonnet-20250219",  # Based on your config
            },
            tags=["claude-code", "agentic", f"project-{self.project_id}"],
        )

        # Count input tokens from prompt and system prompt
        prompt_tokens = count_tokens(prompt)
        system_prompt = self._build_system_prompt()
        system_tokens = count_tokens(system_prompt)

        # Add to input tokens (context tokens include system prompt)
        self.total_input_tokens += prompt_tokens
        self.total_context_tokens += system_tokens

        logger.info(f"📊 Input tokens: {prompt_tokens}, Context tokens: {system_tokens}")

        try:
            # Setup options and run query
            options = self._setup_claude_code_options(max_turns)
            
            # Collect output for tracing
            collected_output = []
            async for event in self._stream_query_events(prompt, options, trace):
                if event.get("type") == "text":
                    collected_output.append(event.get("text", ""))
                yield event

            # Update trace with final output
            trace.update(
                output={"response": "".join(collected_output)},
                usage={
                    "input_tokens": self.total_input_tokens,
                    "output_tokens": self.total_output_tokens,
                    "total_tokens": self.total_input_tokens + self.total_output_tokens,
                }
            )

        except (CLINotFoundError, ProcessError, ClaudeSDKError) as e:
            trace.update(
                output={"error": str(e), "error_type": type(e).__name__},
                level="ERROR"
            )
            async for error_event in self._handle_known_error(e):
                yield error_event
        except Exception as e:
            trace.update(
                output={"error": str(e), "error_type": type(e).__name__},
                level="ERROR"
            )
            async for error_event in self._handle_unexpected_error(e):
                yield error_event
        finally:
            # End the trace
            trace.end()

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
        self, prompt: str, options: ClaudeCodeOptions, trace: Any = None
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Stream events from the agentic query"""
        logger.info("🚀 Starting Claude Code query stream...")
        message_count = 0

        # Create a span for the query execution
        span = None
        if trace:
            span = trace.span(
                name="claude-code-query-execution",
                input={"prompt": prompt},
                metadata={"max_turns": options.max_turns, "tool_count": len(options.allowed_tools or [])}
            )

        try:
            async for message in query(prompt=prompt, options=options):
                message_count += 1
                logger.debug(f"📨 Received message {message_count}: {type(message).__name__}")

                async for event in self._process_message(message, message_count, span):
                    yield event

            logger.info(f"✅ Processed {message_count} messages from Claude Code stream")
            
            if span:
                span.update(
                    output={"message_count": message_count, "status": "completed"}
                )
        except Exception as e:
            if span:
                span.update(
                    output={"error": str(e), "message_count": message_count},
                    level="ERROR"
                )
            raise
        finally:
            if span:
                span.end()

    async def _process_message(self, message: Any, message_count: int, span: Any = None) -> AsyncGenerator[dict[str, Any], None]:
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

        async for text_event in self._simulate_text_streaming(block.text, message_id):
            yield text_event

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
