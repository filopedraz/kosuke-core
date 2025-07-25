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

    async def send_message(
        self,
        project_id: int,
        content: str,
        role: str = "assistant",
        model_type: str = "premium",
        tokens_input: int = 0,
        tokens_output: int = 0,
        context_tokens: int = 0,
    ) -> bool:
        """Send assistant message to Next.js database"""
        endpoint = f"/api/projects/{project_id}/webhook/message"
        data = {
            "content": content,
            "role": role,
            "modelType": model_type,
            "tokensInput": tokens_input,
            "tokensOutput": tokens_output,
            "contextTokens": context_tokens,
        }

        return await self._send_webhook_with_retry(endpoint, data)

    async def send_action(
        self, project_id: int, action_type: str, path: str, status: str = "completed", message_id: int | None = None
    ) -> bool:
        """Send file operation to Next.js database"""
        endpoint = f"/api/projects/{project_id}/webhook/action"
        data = {
            "type": action_type,
            "path": path,
            "status": status,
        }

        if message_id:
            data["messageId"] = message_id

        return await self._send_webhook_with_retry(endpoint, data)

    async def send_completion(
        self,
        project_id: int,
        success: bool = True,
        total_actions: int = 0,
        total_tokens: int = 0,
        duration: float = 0.0,
    ) -> bool:
        """Send session completion to Next.js"""
        endpoint = f"/api/projects/{project_id}/webhook/complete"
        data = {
            "success": success,
            "totalActions": total_actions,
            "totalTokens": total_tokens,
            "duration": int(duration * 1000),  # Convert to milliseconds
        }

        return await self._send_webhook_with_retry(endpoint, data)

    async def send_multiple_actions(self, project_id: int, actions: list[dict[str, Any]]) -> bool:
        """Send multiple actions efficiently"""
        success_count = 0

        for action in actions:
            if await self.send_action(
                project_id=project_id,
                action_type=action.get("type"),
                path=action.get("path"),
                status=action.get("status", "completed"),
                message_id=action.get("message_id"),
            ):
                success_count += 1

        logger.info(f"✅ Sent {success_count}/{len(actions)} actions successfully")
        return success_count == len(actions)


# Global webhook service instance
webhook_service = WebhookService()
