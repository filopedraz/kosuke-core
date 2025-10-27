import asyncio
import logging
from contextlib import suppress
from pathlib import Path

import aiohttp
import docker
from docker.errors import ImageNotFound

from app.models.preview import PreviewStatus
from app.services.domain_service import DomainService
from app.services.router_adapters import PortRouterAdapter
from app.services.router_adapters import TraefikRouterAdapter
from app.services.session_manager import SessionManager
from app.utils.config import settings

logger = logging.getLogger(__name__)


class DockerService:
    """Stateless container manager for previews with pluggable routing."""

    def __init__(self):
        try:
            self.client = docker.from_env()
            self.client.ping()
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise RuntimeError(f"Docker client initialization failed: {e}") from e

        self.session_manager = SessionManager()
        self.domain_service = DomainService()
        self.host_projects_dir = self._get_host_projects_dir()
        logger.info(f"DockerService initialized with host projects directory: {self.host_projects_dir}")

        # Router adapter selection
        if settings.router_mode == "traefik":
            self.adapter = TraefikRouterAdapter(self.domain_service)
        else:
            self.adapter = PortRouterAdapter(settings.preview_port_range_start, settings.preview_port_range_end)

        # Pre-pull image in background
        self._image_pull_task = asyncio.create_task(self._ensure_preview_image())

    async def _ensure_preview_image(self) -> None:
        try:
            image_name = settings.preview_default_image
            logger.info(f"Checking preview image {image_name}")
            loop = asyncio.get_event_loop()
            try:
                await asyncio.wait_for(loop.run_in_executor(None, self.client.images.get, image_name), timeout=5.0)
                logger.info(f"Preview image {image_name} is available locally")
            except (ImageNotFound, TimeoutError):
                logger.info(f"Pulling preview image {image_name}...")
                await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: self.client.images.pull(image_name)), timeout=300.0
                )
                logger.info(f"Successfully pulled preview image {image_name}")
        except Exception as e:
            logger.error(f"Failed to ensure preview image {settings.preview_default_image}: {e}")

    def _get_host_projects_dir(self) -> str:
        """Resolve the host projects directory for Docker-in-Docker.

        This application requires running under Docker-in-Docker (DinD). The absolute
        path to the workspace root on the host must be provided via HOST_WORKSPACE_DIR.
        """
        host_workspace_dir = settings.host_workspace_dir
        if not host_workspace_dir:
            raise RuntimeError(
                "HOST_WORKSPACE_DIR is required when running inside Docker-in-Docker. "
                "Set HOST_WORKSPACE_DIR to the absolute path of the workspace root on the host."
            )
        host_projects_dir = Path(host_workspace_dir) / "projects"
        logger.info(f"Using HOST_WORKSPACE_DIR: {host_projects_dir}")
        return str(host_projects_dir)

    def _get_container_name(self, project_id: int, session_id: str) -> str:
        return f"{settings.preview_container_name_prefix}{project_id}-{session_id}"

    async def is_docker_available(self) -> bool:
        try:
            loop = asyncio.get_event_loop()
            await asyncio.wait_for(loop.run_in_executor(None, self.client.ping), timeout=5.0)
            return True
        except Exception:
            return False

    async def _check_container_health(self, url: str, timeout: float = 2.0) -> bool:
        try:
            # Adjust for DinD probing only
            base_url = url.replace("localhost", "host.docker.internal")
            health_url = base_url.rstrip("/") + settings.preview_health_path
            timeout_config = aiohttp.ClientTimeout(total=timeout)
            async with aiohttp.ClientSession(timeout=timeout_config) as session, session.get(health_url) as response:
                return response.status == 200
        except Exception as e:
            logger.debug(f"Health check failed for {url}: {e}")
            return False

    async def _get_container_by_name(self, name: str):
        loop = asyncio.get_event_loop()
        try:
            return await asyncio.wait_for(loop.run_in_executor(None, self.client.containers.get, name), timeout=5.0)
        except Exception:
            return None

    def _resolve_url_from_container(self, container) -> str | None:
        labels = container.labels or {}
        if settings.router_mode == "traefik":
            project_id = labels.get("kosuke.project_id")
            branch_name = labels.get("kosuke.branch")
            if project_id and branch_name:
                domain = self.domain_service.generate_subdomain(int(project_id), branch_name)
                return f"https://{domain}"
            # Fallback from container name
            try:
                _, project_session = container.name.replace(settings.preview_container_name_prefix, "").split("-", 1)
                pid = int(project_session.split("-", 1)[0])
                sid = project_session.split("-", 1)[1]
                domain = self.domain_service.generate_subdomain(pid, sid)
                return f"https://{domain}"
            except Exception:
                return None
        # Port mapping
        ports = container.ports or {}
        mapping = ports.get("3000/tcp")
        if mapping and len(mapping) > 0 and mapping[0].get("HostPort"):
            return f"http://localhost:{int(mapping[0]['HostPort'])}"
        return None

    async def stop_preview(self, project_id: int, session_id: str) -> None:
        container_name = self._get_container_name(project_id, session_id)
        container = await self._get_container_by_name(container_name)
        if not container:
            return
        loop = asyncio.get_event_loop()
        with suppress(Exception):
            await asyncio.wait_for(loop.run_in_executor(None, lambda: container.stop(timeout=5)), timeout=15.0)
        with suppress(Exception):
            await asyncio.wait_for(loop.run_in_executor(None, lambda: container.remove(force=True)), timeout=10.0)

    async def get_preview_status(self, project_id: int, session_id: str) -> PreviewStatus:
        container_name = self._get_container_name(project_id, session_id)
        container = await self._get_container_by_name(container_name)
        if not container:
            return PreviewStatus(running=False, url=None, is_responding=False)

        if container.status != "running":
            return PreviewStatus(running=False, url=None, is_responding=False)

        url = self._resolve_url_from_container(container)
        is_responding = False
        if url:
            is_responding = await self._check_container_health(url)
        return PreviewStatus(running=True, url=url, is_responding=is_responding)

    async def is_container_running(self, project_id: int, session_id: str) -> bool:
        container_name = self._get_container_name(project_id, session_id)
        container = await self._get_container_by_name(container_name)
        return bool(container and container.status == "running")

    async def restart_preview_container(self, project_id: int, session_id: str) -> None:
        container_name = self._get_container_name(project_id, session_id)
        container = await self._get_container_by_name(container_name)
        if not container:
            logger.warning(f"Container not found for project {project_id} session {session_id}")
            return
        loop = asyncio.get_event_loop()
        try:
            await asyncio.wait_for(loop.run_in_executor(None, container.restart), timeout=30.0)
        except Exception as e:
            logger.error(f"Error restarting container for project {project_id} session {session_id}: {e}")
            raise

    async def get_project_preview_urls(self, project_id: int) -> dict:
        try:
            name_prefix = f"{settings.preview_container_name_prefix}{project_id}-"
            loop = asyncio.get_event_loop()
            containers = await loop.run_in_executor(
                None, lambda: self.client.containers.list(all=True, filters={"name": name_prefix})
            )
            preview_urls: list[dict] = []
            for c in containers:
                url = self._resolve_url_from_container(c)
                labels = c.labels or {}
                branch_name = (
                    labels.get("kosuke.branch")
                    or c.name.replace(settings.preview_container_name_prefix, "").split("-", 1)[1]
                )
                preview_urls.append(
                    {
                        "id": hash(c.name),
                        "project_id": project_id,
                        "branch_name": branch_name,
                        "subdomain": url.split("//", 1)[1].split(".")[0]
                        if url and url.startswith("https://")
                        else None,
                        "full_url": url,
                        "container_status": c.status,
                        "ssl_enabled": url.startswith("https://") if url else False,
                        "created_at": c.attrs.get("Created"),
                        "last_accessed": None,
                    }
                )
            return {"preview_urls": preview_urls, "total_count": len(preview_urls)}
        except Exception as e:
            logger.error(f"Error getting preview URLs for project {project_id}: {e}")
            return {"preview_urls": [], "total_count": 0}
