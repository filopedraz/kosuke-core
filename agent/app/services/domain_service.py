import logging
import re

from app.utils.config import settings

logger = logging.getLogger(__name__)


class DomainService:
    """Pure domain utilities (no Docker dependencies)."""

    def generate_subdomain(self, project_id: int, branch_name: str) -> str:
        """Generate subdomain based on project ID and branch name."""
        # Sanitize branch name for URL usage
        sanitized_branch = re.sub(r"[^a-zA-Z0-9-]", "-", branch_name.lower())
        sanitized_branch = re.sub(r"-+", "-", sanitized_branch)
        sanitized_branch = sanitized_branch.strip("-")

        # Limit length and ensure it's valid
        if len(sanitized_branch) > 20:
            sanitized_branch = sanitized_branch[:20].rstrip("-")

        # Create subdomain: project-{id}-{branch} on preview base domain
        subdomain = f"project-{project_id}-{sanitized_branch}"
        full_domain = f"{subdomain}.{settings.preview_base_domain}"

        logger.info(f"Generated subdomain: {full_domain} for project {project_id}, branch: {branch_name}")
        return full_domain

    def generate_main_domain(self) -> str:
        """Get the main application domain."""
        return settings.main_domain or "kosuke.ai"
