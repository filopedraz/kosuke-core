import logging
import re

import docker

from app.utils.config import settings

logger = logging.getLogger(__name__)


class DomainService:
    def __init__(self):
        self.docker_client = docker.from_env()

    def generate_subdomain(self, project_id: int, branch_name: str) -> str:
        """Generate subdomain based on project ID and branch name"""
        # Sanitize branch name for URL usage
        sanitized_branch = re.sub(r"[^a-zA-Z0-9-]", "-", branch_name.lower())
        sanitized_branch = re.sub(r"-+", "-", sanitized_branch)
        sanitized_branch = sanitized_branch.strip("-")

        # Limit length and ensure it's valid
        if len(sanitized_branch) > 20:
            sanitized_branch = sanitized_branch[:20].rstrip("-")

        # Create subdomain: project-{id}-{branch} on kosuke.app (preview domain)
        subdomain = f"project-{project_id}-{sanitized_branch}"
        full_domain = f"{subdomain}.{settings.PREVIEW_BASE_DOMAIN}"

        logger.info(f"Generated subdomain: {full_domain} for project {project_id}, branch: {branch_name}")
        return full_domain

    def generate_main_domain(self) -> str:
        """Get the main application domain"""
        return settings.MAIN_DOMAIN or "kosuke.ai"

    async def update_container_routing(self, project_id: int, container_name: str, port: int, branch_name: str) -> str:
        """Update container routing when container starts"""
        full_domain = self.generate_subdomain(project_id, branch_name)
        logger.info(f"Configuring routing for container {container_name} to domain {full_domain}")
        return full_domain

    async def get_domain_routing(self, domain: str) -> str | None:
        """Get routing information for a domain"""
        # Note: In production, this would be handled by Traefik automatically
        # based on container labels. This method is kept for compatibility.
        logger.info(f"Domain routing for {domain} handled by Traefik")
        return domain

    def get_preview_urls_for_project(self, project_id: int) -> list[dict]:
        """Get all preview URLs for a project by inspecting running containers"""
        try:
            container_name_prefix = f"kosuke-preview-{project_id}"
            containers = self.docker_client.containers.list(all=True, filters={"name": container_name_prefix})

            preview_urls = []
            for container in containers:
                try:
                    # Extract branch name from container labels or name
                    labels = container.labels
                    branch_name = labels.get("kosuke.branch", "main")

                    # Get Traefik routing rule to extract domain
                    router_rule = labels.get(f"traefik.http.routers.{container.name}.rule", "")
                    domain = self._extract_domain_from_rule(router_rule)

                    if not domain:
                        # Fallback to generating domain from project_id and branch
                        domain = self.generate_subdomain(project_id, branch_name)

                    preview_url = {
                        "id": hash(container.name),  # Use hash as unique ID
                        "project_id": project_id,
                        "branch_name": branch_name,
                        "subdomain": domain.split(".")[0],  # Extract subdomain part
                        "full_url": f"https://{domain}",
                        "container_status": container.status,
                        "ssl_enabled": True,  # Always true with Let's Encrypt
                        "created_at": container.attrs["Created"],
                        "last_accessed": None,  # Would need to track this separately
                    }
                    preview_urls.append(preview_url)

                except Exception as e:
                    logger.warning(f"Error processing container {container.name}: {e}")
                    continue

            return preview_urls

        except Exception as e:
            logger.error(f"Error getting preview URLs for project {project_id}: {e}")
            return []

    def _extract_domain_from_rule(self, rule: str) -> str | None:
        """Extract domain from Traefik Host() rule"""
        match = re.search(r"Host\(`([^`]+)`\)", rule)
        return match.group(1) if match else None
