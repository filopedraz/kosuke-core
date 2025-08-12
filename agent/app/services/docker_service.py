import asyncio
import logging
from contextlib import suppress
from pathlib import Path

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
            except (ImageNotFound, asyncio.TimeoutError):
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

    def _prepare_container_environment(
        self, project_id: int, session_id: str, env_vars: dict[str, str]
    ) -> dict[str, str]:
        postgres_url = (
            f"postgres://{settings.postgres_user}:{settings.postgres_password}"
            f"@{settings.postgres_host}:{settings.postgres_port}"
            f"/kosuke_project_{project_id}_session_{session_id}"
        )
        return {
            "NODE_ENV": "development",
            "PORT": "3000",
            "POSTGRES_URL": postgres_url,
            **env_vars,
        }

    async def is_docker_available(self) -> bool:
        try:
            loop = asyncio.get_event_loop()
            await asyncio.wait_for(loop.run_in_executor(None, self.client.ping), timeout=5.0)
            return True
        except Exception:
            return False

    def _get_host_session_path(self, project_id: int, session_id: str) -> Path:
        session_path = Path(self.host_projects_dir) / str(project_id) / "sessions" / session_id
        return session_path.resolve()

    async def _check_container_health(self, url: str, timeout: float = 2.0) -> bool:
        try:
            import aiohttp

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

    async def _ensure_session_environment(self, project_id: int, session_id: str) -> None:
        if not self.session_manager.validate_session_directory(project_id, session_id):
            logger.info(f"Creating session environment for {session_id}")
            self.session_manager.create_session_environment(project_id, session_id)

    async def _ensure_database_exists(self, project_id: int, session_id: str) -> None:
        """Ensure the database exists for the given project and session"""
        try:
            from app.services.database_service import DatabaseService

            # Create DatabaseService instance to trigger database creation
            db_service = DatabaseService(project_id, session_id)

            # Try to get database info - this will create the database if it doesn't exist
            logger.info(f"Ensuring database exists for project {project_id} session {session_id}")
            await db_service.get_database_info()
            logger.info(f"Database verified/created for project {project_id} session {session_id}")

        except Exception as e:
            logger.error(f"Failed to ensure database exists for project {project_id} session {session_id}: {e}")
            # Don't fail the preview startup if database creation fails
            # The container can still start and the app can handle DB errors gracefully
            logger.warning(
                f"Preview will start without database guarantee for project {project_id} session {session_id}"
            )

    async def _get_existing_container_url_or_remove(self, container_name: str) -> str | None:
        container = await self._get_container_by_name(container_name)
        if not container:
            return None
        if container.status == "running":
            url = self._resolve_url_from_container(container)
            if url:
                return url
        # Try restart once
        loop = asyncio.get_event_loop()
        try:
            await asyncio.wait_for(loop.run_in_executor(None, container.restart), timeout=30.0)
            await asyncio.wait_for(loop.run_in_executor(None, container.reload), timeout=5.0)
            if container.status == "running":
                url = self._resolve_url_from_container(container)
                if url:
                    return url
        except Exception as e:
            logger.debug(f"Failed to restart existing container {container_name}: {e}")
        # Force remove to allow clean recreate
        with suppress(Exception):
            await asyncio.wait_for(loop.run_in_executor(None, lambda: container.remove(force=True)), timeout=10.0)
        return None

    async def _run_container_with_retries(
        self,
        project_id: int,
        session_id: str,
        environment: dict[str, str],
        host_session_path: Path,
        container_name: str,
    ) -> str:
        await self._ensure_preview_image()
        last_error: Exception | None = None
        loop = asyncio.get_event_loop()
        for attempt in range(1, 4):
            ports, labels, url, host_port = self.adapter.prepare_run(project_id, session_id, container_name)
            logger.info(f"Attempt {attempt}/3 to start preview container {container_name} using host port {host_port}")
            try:
                await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda ports=ports, labels=labels: self.client.containers.run(
                            image=settings.preview_default_image,
                            name=container_name,
                            command=None,
                            ports=ports,
                            volumes={str(host_session_path): {"bind": "/app", "mode": "rw"}},
                            working_dir="/app",
                            environment=environment,
                            network=settings.preview_network,
                            labels=labels,
                            detach=True,
                            auto_remove=False,
                        ),
                    ),
                    timeout=60.0,
                )
                return url
            except Exception as e:
                last_error = e
                message = str(e)
                is_port_conflict = (
                    "port is already allocated" in message
                    or "address already in use" in message
                    or "Bind for 0.0.0.0" in message
                )
                # Clean up any partially created container before retrying
                existing = await self._get_container_by_name(container_name)
                if existing:
                    with suppress(Exception):
                        await asyncio.wait_for(
                            loop.run_in_executor(None, lambda c=existing: c.remove(force=True)), timeout=10.0
                        )
                if is_port_conflict and attempt < 3 and settings.router_mode == "port":
                    logger.warning(
                        f"Host port {host_port} is already in use for {container_name}. Retrying with a new port..."
                    )
                    await asyncio.sleep(0.2)
                    continue
                logger.error(f"Failed to start preview container {container_name} on attempt {attempt}: {message}")
                break
        if last_error:
            raise last_error
        raise RuntimeError("Failed to start preview container due to unknown error")

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

    async def start_preview(self, project_id: int, session_id: str, env_vars: dict[str, str] | None = None) -> str:
        env_vars = env_vars or {}

        container_name = self._get_container_name(project_id, session_id)
        logger.info(f"Start preview for project {project_id} session {session_id} as {container_name}")

        # Ensure session environment exists
        await self._ensure_session_environment(project_id, session_id)

        # Ensure database exists for this session
        await self._ensure_database_exists(project_id, session_id)

        # Reuse existing running container if possible; otherwise ensure it's removed
        url = await self._get_existing_container_url_or_remove(container_name)
        if url:
            return url

        # Create new container
        host_session_path = self._get_host_session_path(project_id, session_id)
        if not host_session_path.is_absolute():
            raise ValueError(f"Host session path must be absolute, got: {host_session_path}")

        environment = self._prepare_container_environment(project_id, session_id, env_vars)
        return await self._run_container_with_retries(
            project_id, session_id, environment, host_session_path, container_name
        )

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
