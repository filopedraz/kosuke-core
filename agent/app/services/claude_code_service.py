"""
Claude Code Service - Wrapper for claude-code-sdk agentic pipeline
"""
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
from claude_code_sdk import ToolUseBlock
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
            # Enhanced prompt with system instructions
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

            # Include cursor rules if they exist
            cursor_rules = self._get_cursor_rules()

            # Build complete system prompt
            system_prompt_parts = [base_system_prompt]
            if cursor_rules:
                system_prompt_parts.append(cursor_rules)
                logger.info("📋 Added cursor rules to system prompt")

            system_prompt = "\n\n".join(system_prompt_parts)
            logger.info(f"📋 System prompt length: {len(system_prompt)} characters")

            # Set up claude-code options with all available tools
            all_tools = [
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

            options = ClaudeCodeOptions(
                cwd=str(self.project_path),
                allowed_tools=all_tools,  # Enable all available tools
                permission_mode="acceptEdits",  # Auto-accept file edits
                max_turns=max_turns,
                system_prompt=system_prompt,
                # Note: model parameter may not be available in claude-code-sdk
                # The CLI uses whatever model is configured globally
            )

            logger.info("⚙️ Claude Code options configured:")
            logger.info(f"  📁 CWD: {options.cwd}")
            logger.info(f"  🔧 Tools ({len(all_tools)}): {all_tools}")
            logger.info(f"  🔐 Permission mode: {options.permission_mode}")
            logger.info(f"  🔄 Max turns: {options.max_turns}")

            # Log the currently configured model
            import os

            current_model = os.getenv("CLAUDE_MODEL", "default")
            logger.info(f"🤖 Model (from env): {current_model}")
            logger.info("📝 Note: Model is configured globally in Claude Code CLI via CLAUDE_MODEL env var")

            # Stream the agentic query
            logger.info("🚀 Starting Claude Code query stream...")
            message_count = 0

            async for message in query(prompt=prompt, options=options):
                message_count += 1
                logger.debug(f"📨 Received message {message_count}: {type(message).__name__}")

                if isinstance(message, AssistantMessage):
                    logger.debug(f"🤖 Processing AssistantMessage with {len(message.content)} blocks")

                    # Process assistant message content
                    for block_idx, block in enumerate(message.content):
                        if isinstance(block, TextBlock):
                            logger.debug(f"📝 Text block {block_idx}: {len(block.text)} chars")
                            # AssistantMessage doesn't have .id attribute in claude-code-sdk
                            message_id = getattr(message, "id", None) or f"msg_{abs(hash(str(message)))}"
                            yield {"type": "text", "text": block.text, "message_id": message_id}
                        elif isinstance(block, ToolUseBlock):
                            logger.info(f"🔧 Tool use block {block_idx}: {block.name} (id: {block.id})")
                            logger.debug(f"🔧 Tool input: {str(block.input)[:200]}...")
                            yield {
                                "type": "tool_start",
                                "tool_name": block.name,
                                "tool_input": block.input,
                                "tool_id": block.id,
                            }
                        else:
                            logger.debug(f"❓ Unknown block type {block_idx}: {type(block).__name__}")
                else:
                    # Handle other message types (tool results, etc)
                    logger.debug(f"📤 Other message type: {type(message).__name__}")
                    logger.debug(f"📤 Message content preview: {str(message)[:200]}...")
                    yield {"type": "message", "message": str(message)}

            logger.info(f"✅ Processed {message_count} messages from Claude Code stream")

        except CLINotFoundError as e:
            error_msg = "Claude Code CLI not found. Please install: npm install -g @anthropic-ai/claude-code"
            logger.error(f"❌ {error_msg}")
            logger.error(f"❌ CLINotFoundError details: {e}")
            yield {"type": "error", "message": error_msg}
        except ProcessError as e:
            error_msg = f"Process failed with exit code {e.exit_code}: {e}"
            logger.error(f"❌ ProcessError: {error_msg}")
            logger.error(f"❌ Exit code: {e.exit_code}")
            yield {"type": "error", "message": error_msg}
        except ClaudeSDKError as e:
            error_msg = f"Claude SDK error: {e}"
            logger.error(f"❌ ClaudeSDKError: {error_msg}")
            logger.error(f"❌ SDK error type: {type(e).__name__}")
            yield {"type": "error", "message": error_msg}
        except Exception as e:
            error_msg = f"Unexpected error in agentic pipeline: {e}"
            logger.error(f"❌ Unexpected error: {error_msg}")
            logger.error(f"❌ Error type: {type(e).__name__}")
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
