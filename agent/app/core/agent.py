"""
Agent - Advanced agentic pipeline using claude-code-sdk with Langfuse observability
"""
import time
from collections.abc import AsyncGenerator
from typing import Optional
import logging

from app.services.claude_code_service import ClaudeCodeService
from app.services.github_service import GitHubService
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

    def __init__(self, project_id: int, assistant_message_id: int | None = None):
        self.project_id = project_id
        self.assistant_message_id = assistant_message_id
        self.webhook_service = WebhookService()
        self.start_time = time.time()
        self.total_actions = 0

        # GitHub integration attributes
        self.github_service: Optional[GitHubService] = None
        self.current_session_id: Optional[str] = None
        self.github_token: Optional[str] = None

        # Initialize claude-code service
        self.claude_code_service = ClaudeCodeService(project_id)

        print(f"🚀 Agent initialized for project ID: {project_id}")

    def set_github_integration(self, github_token: str, session_id: str):
        """Enable GitHub integration for this agent session"""
        self.github_token = github_token
        self.github_service = GitHubService(github_token)
        self.current_session_id = session_id

        # Start sync session
        if self.github_service:
            self.github_service.start_sync_session(self.project_id, session_id)
            print(f"🔗 GitHub integration enabled for session {session_id}")

    @observe_agentic_workflow("claude-code-agentic-pipeline")
    async def run(self, prompt: str, max_turns: int = 25, github_token: Optional[str] = None, session_id: Optional[str] = None) -> AsyncGenerator[dict, None]:
        """
        Run the claude-code agent for repository analysis and modification

        Args:
            prompt: User prompt/query
            max_turns: Maximum conversation turns
            github_token: Optional GitHub token for auto-commit functionality
            session_id: Optional session ID for GitHub tracking

        Yields:
            Stream of events compatible with existing chat interface
        """
        print(f"🤖 Processing claude-code request for project ID: {self.project_id}")
        processing_start = time.time()

        # Initialize state for text block tracking
        text_state = {"active": False, "content": "", "all_blocks": []}

        try:
            # Check if GitHub integration should be enabled
            if github_token and session_id:
                self.set_github_integration(github_token, session_id)

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
        print(f"⏱️ Total claude-code processing time: {processing_end - processing_start:.2f}s")

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

        # Track file changes for GitHub if enabled
        await self._track_file_changes_if_enabled(event)

    async def _track_file_changes_if_enabled(self, event: dict) -> None:
        """Track file changes for GitHub if integration is enabled"""
        if self.github_service and self.current_session_id:
            tool_name = event.get("tool_name", "")
            tool_input = event.get("tool_input", {})
            
            # Track file changes for relevant tools
            if tool_name in ['str_replace_editor', 'create_file'] and not event.get("is_error", False):
                try:
                    file_path = tool_input.get('path') or tool_input.get('file_path')
                    if file_path and not file_path.startswith('/'):
                        # Track relative file path
                        self.github_service.track_file_change(self.current_session_id, file_path)
                        print(f"📝 Tracked file change: {file_path}")
                except Exception as e:
                    print(f"⚠️ Warning: Error tracking file change for GitHub: {e}")

    async def _handle_error_event(self, event: dict, text_state: dict) -> AsyncGenerator[dict, None]:
        """Handle error events"""
        if text_state["active"]:
            yield {"type": "content_block_stop"}
            self._save_text_content(text_state)

        yield {"type": "error", "message": event["message"]}
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
        """Finalize processing and send webhooks"""
        if text_state["active"]:
            self._save_text_content(text_state)
        await self._send_assistant_message_webhook(text_state["all_blocks"], success=True)

        # Finalize GitHub session if enabled
        await self.finalize_github_session()

    async def _handle_error(self, error: Exception, text_state: dict):
        """Handle errors during processing"""
        if text_state["active"]:
            self._save_text_content(text_state)
        print(f"❌ Error in claude-code agent: {error}")
        await self._send_assistant_message_webhook(text_state["all_blocks"], success=False)

        # If we have GitHub integration and session fails, mark session as failed
        if self.github_service and self.current_session_id:
            try:
                session_summary = self.github_service.end_sync_session(self.current_session_id)
                session_summary["status"] = "failed"
                print(f"🔗 GitHub session marked as failed: {session_summary}")
            except Exception as github_error:
                print(f"⚠️ Warning: Error ending GitHub session: {github_error}")

    async def finalize_github_session(self, commit_message: Optional[str] = None):
        """Finalize the GitHub session and commit changes if enabled"""
        if self.github_service and self.current_session_id:
            try:
                # Commit session changes
                commit = await self.github_service.commit_session_changes(
                    self.current_session_id,
                    commit_message
                )

                # Send webhook about commit
                if commit and self.webhook_service:
                    async with self.webhook_service as webhook:
                        await webhook.send_commit(
                            self.project_id,
                            commit.sha,
                            commit.message,
                            commit.files_changed
                        )

                # End session and get summary
                session_summary = self.github_service.end_sync_session(self.current_session_id)

                print(f"✅ GitHub session completed: {session_summary}")

            except Exception as e:
                print(f"❌ Error finalizing GitHub session: {e}")

    async def _send_assistant_message_webhook(self, assistant_blocks: list, success: bool = True):
        """Send complete assistant message with all blocks to Next.js"""
        try:
            duration = time.time() - self.start_time

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
                )

            print(
                f"✅ Sent assistant message webhook: {len(assistant_blocks)} blocks, "
                f"{token_usage['total_tokens']} tokens"
            )

            # Send completion webhook with GitHub info
            github_commit = None
            session_summary = None
            
            if self.github_service and self.current_session_id:
                # Get session info if available (without ending the session)
                if self.current_session_id in self.github_service.sync_sessions:
                    session = self.github_service.sync_sessions[self.current_session_id]
                    session_summary = {
                        "session_id": self.current_session_id,
                        "project_id": session["project_id"],
                        "files_changed": len(session["files_changed"]),
                        "status": session["status"],
                    }

            async with self.webhook_service as webhook:
                await webhook.send_completion(
                    project_id=self.project_id,
                    success=success,
                    total_actions=self.total_actions,
                    total_tokens=token_usage["total_tokens"],
                    duration=duration,
                    github_commit=github_commit.dict() if github_commit else None,
                    session_summary=session_summary,
                )

            print(
                f"✅ Sent completion webhook: {self.total_actions} actions, {duration:.2f}s, "
                f"{token_usage['total_tokens']} tokens"
            )
        except Exception as e:
            print(f"❌ Failed to send webhooks: {e}")
