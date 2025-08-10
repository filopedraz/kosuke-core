"""
Webhook service for sending data to Next.js endpoints
"""
import asyncio
import logging
from typing import Any

import aiohttp

from app.utils.config import settings

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for sending webhooks to Next.js endpoints"""

    def __init__(self):
        self.nextjs_url = settings.nextjs_url
        self.webhook_secret = settings.webhook_secret
        self.session: aiohttp.ClientSession | None = None
        self.retry_attempts = 3
        self.retry_delay = 1.0  # seconds

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                "Authorization": f"Bearer {self.webhook_secret}",
                "Content-Type": "application/json",
            },
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def _send_webhook_with_retry(self, endpoint: str, data: dict[str, Any]) -> bool:
        """Send webhook with exponential backoff retry"""
        for attempt in range(self.retry_attempts):
            try:
                if not self.session:
                    logger.error("Webhook session not initialized")
                    return False

                url = f"{self.nextjs_url}{endpoint}"
                logger.info(f"Sending webhook to {url} (attempt {attempt + 1})")

                async with self.session.post(url, json=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"✅ Webhook successful: {result}")
                        return True

                    error_text = await response.text()
                    logger.error(f"❌ Webhook failed ({response.status}): {error_text}")

            except Exception as e:
                logger.error(f"❌ Webhook error (attempt {attempt + 1}): {e}")

            # Exponential backoff if not the last attempt
            if attempt < self.retry_attempts - 1:
                delay = self.retry_delay * (2**attempt)
                logger.info(f"Retrying webhook in {delay}s...")
                await asyncio.sleep(delay)

        logger.error(f"❌ Webhook failed after {self.retry_attempts} attempts")
        return False

    async def send_assistant_message(
        self,
        project_id: int,
        content: str | None = None,
        blocks: list[dict[str, Any]] | None = None,
        tokens_input: int = 0,
        tokens_output: int = 0,
        context_tokens: int = 0,
        assistant_message_id: int | None = None,
        commit_sha: str | None = None,
    ) -> bool:
        """Send assistant message with blocks to Next.js database"""
        endpoint = f"/api/projects/{project_id}/webhook/data"
        data = {
            "type": "assistant_message",
            "data": {
                "content": content,
                "blocks": blocks,
                "tokensInput": tokens_input,
                "tokensOutput": tokens_output,
                "contextTokens": context_tokens,
                "assistantMessageId": assistant_message_id,
                "commitSha": commit_sha,
            },
        }

        return await self._send_webhook_with_retry(endpoint, data)

    async def send_completion(
        self,
        project_id: int,
        success: bool = True,
        total_actions: int = 0,
        total_tokens: int = 0,
        duration: float = 0.0,
        github_commit: dict | None = None,
        session_summary: dict | None = None,
    ) -> bool:
        """Send session completion to Next.js with optional GitHub data"""
        endpoint = f"/api/projects/{project_id}/webhook/data"
        data = {
            "type": "completion",
            "data": {
                "success": success,
                "totalActions": total_actions,
                "totalTokens": total_tokens,
                "duration": int(duration * 1000),  # Convert to milliseconds
            },
        }

        # Add GitHub data if available
        if github_commit:
            data["data"]["githubCommit"] = github_commit

        if session_summary:
            data["data"]["sessionSummary"] = session_summary

        return await self._send_webhook_with_retry(endpoint, data)

    async def send_system_message(
        self,
        project_id: int,
        chat_session_id: int | str,
        content: str,
        revert_info: dict[str, Any] | None = None,
    ) -> bool:
        """Send system message (e.g., revert notifications) to Next.js database"""
        endpoint = f"/api/projects/{project_id}/webhook/data"
        data = {
            "type": "system_message",
            "data": {
                "chatSessionId": chat_session_id,
                "content": content,
                "revertInfo": revert_info,
            },
        }
        return await self._send_webhook_with_retry(endpoint, data)
