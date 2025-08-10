"""
Agent - Advanced agentic pipeline using claude-code-sdk with Langfuse observability
"""
import logging
import time
from collections.abc import AsyncGenerator

from app.services.claude_code_service import ClaudeCodeService
from app.services.github_service import GitHubService
from app.services.session_manager import SessionManager
from app.services.webhook_service import WebhookService
from app.utils.observability import observe_agentic_workflow

logger = logging.getLogger(__name__)


class Agent:
    """
    Agent using claude-code-sdk for repository analysis and file modification

    Features:
    - Repository analysis and understanding
    - Intelligent file modification
    - Tool-aware execution (Read, Write, Bash, Grep)
    - Automatic tool execution by claude-code-sdk
    - Comprehensive Langfuse observability
    - GitHub integration for auto-commit functionality
    """

    def __init__(self, project_id: int, session_id: str, assistant_message_id: int | None = None):
        self.project_id = project_id
        self.session_id = session_id
        self.assistant_message_id = assistant_message_id
        self.webhook_service = WebhookService()
        self.start_time = time.time()
        self.total_actions = 0

        # Session management
        self.session_manager = SessionManager()

        # Get session-specific working directory
        self.working_directory = self.session_manager.get_session_path(project_id, session_id)

        # GitHub integration attributes
        self.github_service: GitHubService | None = None
        self.github_token: str | None = None

        # Initialize claude-code service with session directory
        self.claude_code_service = ClaudeCodeService(project_id=project_id, working_directory=self.working_directory)

        logger.info(f"🚀 Agent initialized for project ID: {project_id}, session: {session_id}")
        logger.info(f"📁 Working directory: {self.working_directory}")

    def set_github_integration(self, github_token: str):
        """Enable GitHub integration for this agent session"""
        self.github_token = github_token
        self.github_service = GitHubService(github_token)

        # Start sync session
        if self.github_service:
            self.github_service.start_sync_session(self.project_id, self.session_id)
            print(f"🔗 GitHub integration enabled for session {self.session_id}")

    @observe_agentic_workflow("claude-code-agentic-pipeline")
    async def run(
        self, prompt: str, max_turns: int = 25, github_token: str | None = None
    ) -> AsyncGenerator[dict, None]:
        """
        Run the claude-code agent for repository analysis and modification

        Args:
            prompt: User prompt/query
            max_turns: Maximum conversation turns
            github_token: Optional GitHub token for auto-commit functionality

        Yields:
            Stream of events compatible with existing chat interface
        """
        logger.info(f"🤖 Processing claude-code request for project ID: {self.project_id}")
        processing_start = time.time()

        # Initialize state for text block tracking
        text_state = {"active": False, "content": "", "all_blocks": []}

        try:
            # Check if GitHub integration should be enabled
            logger.info(
                f"🔍 GitHub integration check: token={'✓' if github_token else '✗'}, " f"session={self.session_id}"
            )
            if github_token:
                logger.info(f"🔗 Enabling GitHub integration for session {self.session_id}")
                self.set_github_integration(github_token)
            else:
                raise ValueError(
                    "Missing GitHub token. Start the session with a valid GitHub token to enable commits and tracking."
                )

            # Stream events from claude-code-sdk
            async for event in self.claude_code_service.run_agentic_query(prompt, max_turns):
                self.total_actions += 1

                # Process event and yield results
                async for result in self._process_event(event, text_state):
                    yield result

            # Finalize processing
            await self._finalize_processing(text_state)
            yield {"type": "message_complete"}

        except Exception as e:
            await self._handle_error(e, text_state)
            yield {"type": "error", "message": f"Error in claude-code agent: {e}"}

        processing_end = time.time()
        logger.info(f"⏱️ Total claude-code processing time: {processing_end - processing_start:.2f}s")

    async def _process_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Process a single event from the claude-code service"""
        event_type = event["type"]

        if event_type == "text":
            async for result in self._handle_text_event(event, text_state):
                yield result
        elif event_type == "tool_start":
            async for result in self._handle_tool_start_event(event, text_state):
                yield result
        elif event_type == "tool_stop":
            async for result in self._handle_tool_stop_event(event, text_state):
                yield result
        elif event_type == "error":
            async for result in self._handle_error_event(event, text_state):
                yield result
        elif event_type == "message":
            # Skip system messages to reduce noise in the UI
            pass

    async def _handle_text_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle text events"""
        # If no text block is active, start a new one
        if not text_state["active"]:
            yield {"type": "content_block_start"}
            text_state["active"] = True
            text_state["content"] = ""

        # Pass through text chunks and accumulate content
        yield {"type": "content_block_delta", "delta_type": "text_delta", "text": event["text"], "index": 0}
        text_state["content"] += event["text"]

    async def _handle_tool_start_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle tool start events"""
        # End any active text block before starting a tool
        if text_state["active"]:
            yield {"type": "content_block_stop"}
            self._save_text_content(text_state)

        yield {
            "type": "tool_start",
            "tool_name": event["tool_name"],
            "tool_input": event.get("tool_input", {}),
            "tool_id": event.get("tool_id"),
        }

        # Store tool start info for webhook
        text_state["all_blocks"].append(
            {
                "type": "tool",
                "id": event.get("tool_id"),
                "name": event["tool_name"],
                "input": event.get("tool_input", {}),
                "status": "pending",
            }
        )

    async def _handle_tool_stop_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle tool stop events"""
        yield {
            "type": "tool_stop",
            "tool_id": event["tool_id"],
            "tool_result": event.get("tool_result", ""),
            "is_error": event.get("is_error", False),
        }

        # Update the existing tool block with the result
        self._update_tool_block(event, text_state["all_blocks"])

    async def _handle_error_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle error events"""
        if text_state["active"]:
            yield {"type": "content_block_stop"}
            self._save_text_content(text_state)

        yield {"type": "error", "message": event["message"]}

        # No commit yet; don't attach commit SHA in error assistant message
        await self._send_assistant_message_webhook(text_state["all_blocks"], success=False)

    def _save_text_content(self, text_state: dict):
        """Save accumulated text content and reset state"""
        if text_state["content"].strip():
            text_state["all_blocks"].append({"type": "text", "content": text_state["content"]})
        text_state["active"] = False
        text_state["content"] = ""

    def _update_tool_block(self, event: dict, all_blocks: list):
        """Update tool block with result"""
        for block in all_blocks:
            if block.get("type") == "tool" and block.get("id") == event["tool_id"]:
                block["result"] = event.get("tool_result", "")
                block["status"] = "completed" if not event.get("is_error", False) else "error"
                break

    async def _finalize_processing(self, text_state: dict):
        """Finalize processing: commit changes, then send assistant message webhook once."""
        if text_state["active"]:
            self._save_text_content(text_state)

        commit_sha: str | None = None
        # Finalize GitHub session first to capture commit info
        if self.github_service and self.session_id:
            try:
                commit_sha, _ = await self.finalize_github_session()
            except Exception:
                # Error already logged inside finalize method
                commit_sha = None

        # Send a single assistant message webhook with optional commitSha
        await self._send_assistant_message_webhook(text_state["all_blocks"], success=True, commit_sha=commit_sha)

    async def _handle_error(self, error: Exception, text_state: dict):
        """Handle errors during processing"""
        if text_state["active"]:
            self._save_text_content(text_state)
        logger.error(f"❌ Error in claude-code agent: {error}")

        # No commit yet; don't attach commit SHA in error assistant message
        await self._send_assistant_message_webhook(text_state["all_blocks"], success=False)

        # If we have GitHub integration and session fails, mark session as failed

    async def finalize_github_session(self, commit_message: str | None = None) -> tuple[str | None, dict | None]:
        """Finalize the GitHub session, commit changes, and return (commit_sha, session_summary)."""
        if not (self.github_service and self.session_id):
            return None, None
        try:
            commit = await self.github_service.commit_session_changes(
                session_path=self.working_directory, session_id=self.session_id, commit_message=commit_message
            )
            return (commit.sha if commit else None), None
        except Exception as e:
            print(f"❌ Error finalizing GitHub session: {e}")
            return None, None

    async def _send_assistant_message_webhook(
        self, assistant_blocks: list, success: bool = True, commit_sha: str | None = None
    ):
        """Send assistant message with all blocks to Next.js (single webhook call)."""
        try:
            # Get token usage from claude-code service
            token_usage = self.claude_code_service.get_token_usage()

            # Send assistant message with blocks
            async with self.webhook_service as webhook:
                await webhook.send_assistant_message(
                    project_id=self.project_id,
                    blocks=assistant_blocks,
                    tokens_input=token_usage["input_tokens"],
                    tokens_output=token_usage["output_tokens"],
                    context_tokens=token_usage["context_tokens"],
                    assistant_message_id=self.assistant_message_id,
                    commit_sha=commit_sha,
                )

            logger.info(
                f"✅ Sent assistant message webhook: {len(assistant_blocks)} blocks, "
                f"{token_usage['total_tokens']} tokens, commit_sha: {commit_sha}"
            )
        except Exception as e:
            logger.error(f"❌ Failed to send webhooks: {e}")
