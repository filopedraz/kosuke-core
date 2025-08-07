import asyncio
import logging
import secrets
import os
from typing import Dict, Any

import docker
from docker.errors import ImageNotFound, NotFound

from app.models.preview import ContainerInfo, PreviewStatus, GitUpdateStatus
from app.services.domain_service import DomainService
from app.services.file_storage_service import file_storage
from app.services.project_api_service import project_api
from app.utils.config import settings

logger = logging.getLogger(__name__)


class DockerServiceV2:
    """
    Production-ready Docker service for Digital Ocean that eliminates filesystem mounting
    
    Features:
    - No volume mounting - uses API-based file access
    - Database + blob storage for project files
    - Simplified container management
    - Production-ready for cloud deployments
    - Scalable across multiple hosts
    """
    
    def __init__(self):
        try:
            self.client = docker.from_env()
            self.client.ping()
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise RuntimeError(f"Docker client initialization failed: {e}") from e

        # Track containers by (project_id, session_id) composite key
        self.containers: Dict[tuple[int, str], ContainerInfo] = {}
        self.CONTAINER_NAME_PREFIX = "kosuke-preview-"

        # Initialize services
        self.domain_service = DomainService()

        logger.info("DockerServiceV2 initialized - filesystem mounting disabled")

        # Ensure default preview image is available
        self._image_pull_task = asyncio.create_task(self._ensure_preview_image())

    async def _ensure_preview_image(self) -> None:
        """Ensure the preview Docker image is available locally"""
        try:
            image_name = settings.preview_default_image
            logger.info(f"Checking if preview image {image_name} is available locally")

            loop = asyncio.get_event_loop()
            try:
                await asyncio.wait_for(loop.run_in_executor(None, self.client.images.get, image_name), timeout=5.0)
                logger.info(f"Preview image {image_name} is available locally")
            except (ImageNotFound, asyncio.TimeoutError):
                logger.info(f"Preview image {image_name} not found locally, pulling from registry...")
                await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: self.client.images.pull(image_name)),
                    timeout=300.0,
                )
                logger.info(f"Successfully pulled preview image {image_name}")
        except Exception as e:
            logger.error(f"Failed to ensure preview image {settings.preview_default_image}: {e}")
            logger.warning("Container creation may fail if image is not available")

    async def is_docker_available(self) -> bool:
        """Check if Docker is available with timeout"""
        try:
            loop = asyncio.get_event_loop()
            await asyncio.wait_for(loop.run_in_executor(None, self.client.ping), timeout=5.0)
            return True
        except (Exception, asyncio.TimeoutError) as e:
            logger.error(f"Docker not available: {e}")
            return False

    def _get_random_port(self, min_port: int = 3000, max_port: int = 4000) -> int:
        """Get a random port in range"""
        return min_port + secrets.randbelow(max_port - min_port + 1)

    def _get_container_name(self, project_id: int, session_id: str) -> str:
        """Generate container name for project and session"""
        return f"{self.CONTAINER_NAME_PREFIX}{project_id}-{session_id}"

    def _prepare_container_environment(self, project_id: int, session_id: str, env_vars: Dict[str, str]) -> Dict[str, str]:
        """Prepare environment variables for container"""
        api_base_url = os.getenv("API_BASE_URL", "http://host.docker.internal:8000")
        
        return {
            "NODE_ENV": "development",
            "PORT": "3000",
            "PROJECT_ID": str(project_id),
            "SESSION_ID": session_id,
            "API_BASE_URL": api_base_url,
            "KOSUKE_API_ENABLED": "true",
            **env_vars,
        }

    async def _check_container_health(self, url: str, timeout: float = 2.0) -> bool:
        """Check if container is responding to HTTP requests with timeout"""
        try:
            import aiohttp

            health_check_url = url.replace("localhost", "host.docker.internal")
            timeout_config = aiohttp.ClientTimeout(total=timeout)
            
            async with (
                aiohttp.ClientSession(timeout=timeout_config) as session,
                session.get(health_check_url) as response,
            ):
                return response.status == 200
        except Exception as e:
            logger.debug(f"Health check failed for {url}: {e}")
            return False

    async def _initialize_session_data(self, project_id: int, session_id: str) -> bool:
        """Initialize session data in storage (replaces filesystem session creation)"""
        try:
            if session_id == "main":
                # Main session should already exist or be synced from GitHub
                files = await file_storage.list_files(project_id, "main")
                if not files:
                    logger.warning(f"Main session for project {project_id} has no files")
                return True
            else:
                # For chat sessions, copy from main session
                logger.info(f"Initializing session {session_id} from main for project {project_id}")
                return await project_api.initialize_session_from_main(project_id, session_id)
                
        except Exception as e:
            logger.error(f"Error initializing session data: {e}")
            return False

    async def _get_existing_container(self, container_name: str) -> Dict | None:
        """Get existing container info in executor to avoid blocking"""
        try:
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(None, self.client.containers.get, container_name), timeout=5.0
            )

            logger.info(f"Found existing container {container_name} with status: {container.status}")

            if container.status == "running":
                ports = container.ports
                if "3000/tcp" in ports and ports["3000/tcp"]:
                    host_port = int(ports["3000/tcp"][0]["HostPort"])
                    return {"container": container, "host_port": host_port, "url": f"http://localhost:{host_port}"}
                logger.warning(f"Running container {container_name} has no port mapping")
            elif container.status in ["created", "exited", "dead"]:
                logger.info(f"Attempting to start existing container {container_name}")
                try:
                    await asyncio.wait_for(loop.run_in_executor(None, container.start), timeout=10.0)
                    await asyncio.wait_for(loop.run_in_executor(None, container.reload), timeout=5.0)

                    if container.status == "running":
                        ports = container.ports
                        if "3000/tcp" in ports and ports["3000/tcp"]:
                            host_port = int(ports["3000/tcp"][0]["HostPort"])
                            logger.info(f"Successfully started existing container {container_name} on port {host_port}")
                            return {
                                "container": container,
                                "host_port": host_port,
                                "url": f"http://localhost:{host_port}",
                            }
                except Exception as start_error:
                    logger.warning(f"Failed to start existing container {container_name}: {start_error}")

                logger.info(f"Removing failed container {container_name}")
                await asyncio.wait_for(loop.run_in_executor(None, lambda: container.remove(force=True)), timeout=5.0)

        except (NotFound, asyncio.TimeoutError):
            logger.debug(f"Container {container_name} not found or timeout")
        except Exception as e:
            logger.error(f"Error checking existing container {container_name}: {e}")

        return None

    async def _create_new_container(
        self, project_id: int, session_id: str, container_name: str, env_vars: Dict[str, str]
    ) -> str:
        """Create a new container without volume mounting"""
        
        # Initialize session data in storage
        session_ready = await self._initialize_session_data(project_id, session_id)
        if not session_ready:
            raise Exception(f"Failed to initialize session data for {session_id}")

        environment = self._prepare_container_environment(project_id, session_id, env_vars)

        # Ensure the preview image is available before creating container
        await self._ensure_preview_image()

        # Determine if we're using Traefik or traditional port mapping
        if settings.TRAEFIK_ENABLED:
            ports = {}
            network = "kosuke_network"
            branch_name = session_id
            project_domain = self.domain_service.generate_subdomain(project_id, branch_name)

            labels = {
                "traefik.enable": "true",
                f"traefik.http.routers.{container_name}.rule": f"Host(`{project_domain}`)",
                f"traefik.http.routers.{container_name}.tls.certresolver": "letsencrypt",
                f"traefik.http.services.{container_name}.loadbalancer.server.port": "3000",
                "traefik.docker.network": "kosuke_network",
                "kosuke.project_id": str(project_id),
                "kosuke.session_id": session_id,
                "kosuke.branch": branch_name,
            }
            url = f"https://{project_domain}"
        else:
            host_port = self._get_random_port()
            ports = {"3000/tcp": host_port}
            network = "kosuke_network"
            labels = {
                "kosuke.project_id": str(project_id),
                "kosuke.session_id": session_id,
                "kosuke.branch": session_id,
            }
            url = f"http://localhost:{host_port}"

        # Create container without any volume mounts
        loop = asyncio.get_event_loop()
        container = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: self.client.containers.run(
                    image=settings.preview_default_image,
                    name=container_name,
                    command=None,
                    ports=ports,
                    # NO VOLUMES - all file access through API
                    working_dir="/app",
                    environment=environment,
                    network=network,
                    labels=labels,
                    detach=True,
                    auto_remove=False,
                ),
            ),
            timeout=30.0,
        )

        container_info = ContainerInfo(
            project_id=project_id,
            session_id=session_id,
            container_id=container.id,
            container_name=container_name,
            port=host_port if not settings.TRAEFIK_ENABLED else 3000,
            url=url,
            compilation_complete=False,
            git_status=None,
        )

        container_key = (project_id, session_id)
        self.containers[container_key] = container_info

        # Start compilation monitoring without blocking
        _monitor_task = asyncio.create_task(self._monitor_compilation_async(project_id, session_id))

        return url

    async def start_preview(self, project_id: int, session_id: str, env_vars: Dict[str, str] | None = None) -> str:
        """Start preview container for project session"""
        if env_vars is None:
            env_vars = {}

        container_name = self._get_container_name(project_id, session_id)

        # Check for existing containers
        existing = await self._get_existing_container(container_name)
        if existing:
            container_info = ContainerInfo(
                project_id=project_id,
                session_id=session_id,
                container_id=existing["container"].id,
                container_name=container_name,
                port=existing["host_port"],
                url=existing["url"],
                compilation_complete=True,
                git_status=None,
            )
            container_key = (project_id, session_id)
            self.containers[container_key] = container_info
            return existing["url"]

        try:
            return await self._create_new_container(project_id, session_id, container_name, env_vars)
        except asyncio.TimeoutError:
            logger.error(f"Container creation timeout for project {project_id} session {session_id}")
            raise Exception("Container creation timeout") from None
        except Exception as e:
            logger.error(f"Failed to create container for project {project_id} session {session_id}: {e}")
            
            if "Conflict" in str(e) and "already in use" in str(e):
                return await self._handle_container_conflict(project_id, session_id, container_name)
            
            raise Exception(f"Failed to create container: {e}") from e

    async def _handle_container_conflict(self, project_id: int, session_id: str, container_name: str) -> str | None:
        """Handle container name conflict by trying to recover existing container"""
        logger.info(f"Container name conflict for project {project_id} session {session_id}, attempting recovery")
        existing = await self._get_existing_container(container_name)
        if existing:
            logger.info(f"Successfully recovered existing container for project {project_id} session {session_id}")
            container_info = ContainerInfo(
                project_id=project_id,
                session_id=session_id,
                container_id=existing["container"].id,
                container_name=container_name,
                port=existing["host_port"],
                url=existing["url"],
                compilation_complete=True,
                git_status=None,
            )
            container_key = (project_id, session_id)
            self.containers[container_key] = container_info
            return existing["url"]
        raise Exception("Failed to recover from container conflict")

    async def _monitor_compilation_async(self, project_id: int, session_id: str) -> None:
        """Monitor compilation in a non-blocking way with timeout"""
        try:
            container_key = (project_id, session_id)
            if container_key not in self.containers:
                return

            container_info = self.containers[container_key]
            start_time = asyncio.get_event_loop().time()
            timeout = 60.0

            while (asyncio.get_event_loop().time() - start_time) < timeout:
                if await self._check_container_health(container_info.url, timeout=1.0):
                    if container_key in self.containers:
                        self.containers[container_key].compilation_complete = True
                        logger.info(f"Project {project_id} session {session_id} compilation completed and responsive")
                    return

                await asyncio.sleep(2.0)

            logger.warning(f"Project {project_id} session {session_id} compilation monitoring timeout after {timeout}s")

        except Exception as e:
            logger.error(f"Error monitoring compilation for project {project_id} session {session_id}: {e}")

    async def stop_preview(self, project_id: int, session_id: str) -> None:
        """Stop preview container for project session"""
        container_key = (project_id, session_id)
        if container_key not in self.containers:
            return

        container_info = self.containers[container_key]

        try:
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(None, self.client.containers.get, container_info.container_id), timeout=5.0
            )

            await asyncio.wait_for(loop.run_in_executor(None, lambda: container.stop(timeout=5)), timeout=10.0)
            await asyncio.wait_for(loop.run_in_executor(None, lambda: container.remove(force=True)), timeout=5.0)

        except (NotFound, asyncio.TimeoutError):
            pass
        except Exception as e:
            logger.error(f"Error stopping container for project {project_id} session {session_id}: {e}")
        finally:
            if container_key in self.containers:
                del self.containers[container_key]

    async def get_preview_status(self, project_id: int, session_id: str) -> PreviewStatus:
        """Get preview status for project session"""
        container_key = (project_id, session_id)

        if container_key not in self.containers:
            existing = await self._get_existing_container(self._get_container_name(project_id, session_id))
            if existing:
                container_info = ContainerInfo(
                    project_id=project_id,
                    session_id=session_id,
                    container_id=existing["container"].id,
                    container_name=self._get_container_name(project_id, session_id),
                    port=existing["host_port"],
                    url=existing["url"],
                    compilation_complete=True,
                    git_status=None,
                )
                self.containers[container_key] = container_info

                is_responding = await self._check_container_health(existing["url"])
                return PreviewStatus(
                    running=True,
                    url=existing["url"],
                    compilation_complete=True,
                    is_responding=is_responding,
                    git_status=None,
                )

            return PreviewStatus(
                running=False, url=None, compilation_complete=False, is_responding=False, git_status=None
            )

        container_info = self.containers[container_key]
        is_responding = await self._check_container_health(container_info.url)

        return PreviewStatus(
            running=True,
            url=container_info.url,
            compilation_complete=container_info.compilation_complete,
            is_responding=is_responding,
            git_status=container_info.git_status,
        )

    async def stop_all_previews(self) -> None:
        """Stop all preview containers"""
        container_keys = list(self.containers.keys())
        tasks = [self.stop_preview(project_id, session_id) for project_id, session_id in container_keys]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def sync_project_files(self, project_id: int, session_id: str, github_token: str, repo_url: str) -> Dict:
        """Sync project files with GitHub (replaces filesystem-based git operations)"""
        try:
            return await project_api.sync_with_github(project_id, session_id, github_token, repo_url)
        except Exception as e:
            logger.error(f"Error syncing project files: {e}")
            raise

    async def cleanup_session_data(self, project_id: int, session_id: str) -> bool:
        """Clean up session data from storage"""
        try:
            return await project_api.cleanup_session(project_id, session_id)
        except Exception as e:
            logger.error(f"Error cleaning up session data: {e}")
            return False

    async def get_project_preview_urls(self, project_id: int) -> Dict:
        """Get all preview URLs for a project"""
        try:
            preview_urls = self.domain_service.get_preview_urls_for_project(project_id)
            return {"preview_urls": preview_urls, "total_count": len(preview_urls)}
        except Exception as e:
            logger.error(f"Error getting preview URLs for project {project_id}: {e}")
            return {"preview_urls": [], "total_count": 0}