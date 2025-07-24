# 📋 Ticket 12: Integrate GitHub Auto-Commit in Agent Workflow

**Priority:** High  
**Estimated Effort:** 4 hours

## Description

Integrate GitHub auto-commit functionality into the existing agent workflow, so file changes made by the AI are automatically tracked and committed at session end.

## Files to Update

```
agent/app/core/agent.py
agent/app/core/actions.py
agent/app/services/webhook_service.py
```

## Implementation Details

**agent/app/core/agent.py** - Update to integrate GitHub tracking:

```python
# Add imports
from app.services.github_service import GitHubService
from typing import Optional

class Agent:
    def __init__(self):
        # ... existing initialization
        self.github_service: Optional[GitHubService] = None
        self.current_session_id: Optional[str] = None
        self.github_token: Optional[str] = None

    def set_github_integration(self, github_token: str, session_id: str):
        """Enable GitHub integration for this agent session"""
        self.github_token = github_token
        self.github_service = GitHubService(github_token)
        self.current_session_id = session_id

        # Start sync session
        if self.github_service:
            self.github_service.start_sync_session(self.project_id, session_id)

    async def process_request(self, request: ChatRequest) -> None:
        """Enhanced to support GitHub integration"""
        try:
            # ... existing code for processing request

            # Check if GitHub integration should be enabled
            if request.github_token and request.session_id:
                self.set_github_integration(request.github_token, request.session_id)

            # ... rest of existing processing logic

        except Exception as e:
            # ... existing error handling

            # If we have GitHub integration and session fails, mark session as failed
            if self.github_service and self.current_session_id:
                try:
                    session_summary = self.github_service.end_sync_session(self.current_session_id)
                    session_summary["status"] = "failed"
                except:
                    pass  # Don't fail the main error handling

            raise e

    async def finalize_session(self, commit_message: Optional[str] = None):
        """Finalize the session and commit changes to GitHub if enabled"""
        if self.github_service and self.current_session_id:
            try:
                # Commit session changes
                commit = await self.github_service.commit_session_changes(
                    self.current_session_id,
                    commit_message
                )

                # Send webhook about commit
                if commit and self.webhook_service:
                    await self.webhook_service.send_commit(
                        self.project_id,
                        commit.sha,
                        commit.message,
                        commit.files_changed
                    )

                # End session
                session_summary = self.github_service.end_sync_session(self.current_session_id)

                # Send completion webhook with GitHub info
                if self.webhook_service:
                    await self.webhook_service.send_completion(
                        self.project_id,
                        len(self.iteration_results),
                        self.total_tokens,
                        github_commit=commit.dict() if commit else None,
                        session_summary=session_summary
                    )

            except Exception as e:
                logger.error(f"Error finalizing GitHub session: {e}")
                # Still send completion webhook even if GitHub fails
                if self.webhook_service:
                    await self.webhook_service.send_completion(
                        self.project_id,
                        len(self.iteration_results),
                        self.total_tokens
                    )
```

**agent/app/core/actions.py** - Update to track file changes:

```python
# Update ActionExecutor class
class ActionExecutor:
    def __init__(self, project_id: int, github_service: Optional[GitHubService] = None, session_id: Optional[str] = None):
        self.project_id = project_id
        self.github_service = github_service
        self.session_id = session_id

    async def execute_action(self, action: Action) -> ActionExecutionResult:
        """Enhanced to track GitHub file changes"""
        try:
            # ... existing action execution logic

            result = await self._execute_single_action(action)

            # Track file changes for GitHub if enabled
            if (self.github_service and self.session_id and
                action.type in ['create_file', 'edit_file', 'create_directory']):
                try:
                    file_path = action.filePath
                    if file_path and not file_path.startswith('/'):
                        # Track relative file path
                        self.github_service.track_file_change(self.session_id, file_path)
                except Exception as e:
                    logger.warning(f"Error tracking file change for GitHub: {e}")
                    # Don't fail the action if GitHub tracking fails

            return result

        except Exception as e:
            # ... existing error handling
            raise e
```

**agent/app/services/webhook_service.py** - Add commit webhook:

```python
# Add new method to WebhookService class
async def send_commit(
    self,
    project_id: int,
    commit_sha: str,
    commit_message: str,
    files_changed: int
) -> bool:
    """Send commit information to Next.js via webhook"""
    webhook_url = f"{self.base_url}/api/projects/{project_id}/webhook/commit"

    payload = {
        "commit_sha": commit_sha,
        "commit_message": commit_message,
        "files_changed": files_changed,
        "timestamp": datetime.now().isoformat()
    }

    return await self._send_webhook(webhook_url, payload, "commit")

# Update send_completion method to include GitHub info
async def send_completion(
    self,
    project_id: int,
    total_actions: int,
    total_tokens: int,
    github_commit: Optional[dict] = None,
    session_summary: Optional[dict] = None
) -> bool:
    """Send completion information with optional GitHub data"""
    webhook_url = f"{self.base_url}/api/projects/{project_id}/webhook/complete"

    payload = {
        "total_actions": total_actions,
        "total_tokens": total_tokens,
        "timestamp": datetime.now().isoformat()
    }

    if github_commit:
        payload["github_commit"] = github_commit

    if session_summary:
        payload["session_summary"] = session_summary

    return await self._send_webhook(webhook_url, payload, "completion")
```

## Acceptance Criteria

- [x] GitHub integration embedded in agent workflow
- [x] File changes automatically tracked during AI operations
- [x] Session-based commit functionality
- [x] Webhook notifications for commits
- [x] Graceful handling when GitHub integration disabled
