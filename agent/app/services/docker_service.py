import asyncio
import logging
import os
import secrets
from pathlib import Path

import docker
from docker.errors import ImageNotFound
from docker.errors import NotFound

from app.models.preview import ContainerInfo
from app.models.preview import GitUpdateStatus
from app.models.preview import PreviewStatus
from app.services.domain_service import DomainService
from app.services.session_manager import SessionManager
from app.utils.config import settings

logger = logging.getLogger(__name__)


class DockerService:
    def __init__(self):
        try:
            self.client = docker.from_env()
            # Test connection immediately
            self.client.ping()
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise RuntimeError(f"Docker client initialization failed: {e}") from e

        # Track containers by (project_id, session_id) composite key
        self.containers: dict[tuple[int, str], ContainerInfo] = {}
        self.CONTAINER_NAME_PREFIX = "kosuke-preview-"

        # Initialize session manager and domain service
        self.session_manager = SessionManager()
        self.domain_service = DomainService()

        # Determine the correct host projects directory
        self.host_projects_dir = self._get_host_projects_dir()
        logger.info(f"DockerService initialized with host projects directory: {self.host_projects_dir}")

        # Ensure default preview image is available
        self._image_pull_task = asyncio.create_task(self._ensure_preview_image())

    async def _ensure_preview_image(self) -> None:
        """Ensure the preview Docker image is available locally"""
        try:
            image_name = settings.preview_default_image
            logger.info(f"Checking if preview image {image_name} is available locally")

            # Run image inspection in executor to avoid blocking
            loop = asyncio.get_event_loop()
            try:
                await asyncio.wait_for(loop.run_in_executor(None, self.client.images.get, image_name), timeout=5.0)
                logger.info(f"Preview image {image_name} is available locally")
            except (ImageNotFound, asyncio.TimeoutError):
                logger.info(f"Preview image {image_name} not found locally, pulling from registry...")

                # Pull the image
                await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: self.client.images.pull(image_name)),
                    timeout=300.0,  # 5 minutes timeout for pulling
                )
                logger.info(f"Successfully pulled preview image {image_name}")
        except Exception as e:
            logger.error(f"Failed to ensure preview image {settings.preview_default_image}: {e}")
            logger.warning("Container creation may fail if image is not available")

    def _get_host_projects_dir(self) -> str:
        """Get the correct host path for projects directory"""
        # Check if we're running in Docker-in-Docker
        if Path("/.dockerenv").exists() and Path("/var/run/docker.sock").exists():
            # Docker-in-Docker setup
            host_workspace_dir = os.getenv("HOST_WORKSPACE_DIR")
            if host_workspace_dir:
                host_projects_dir = Path(host_workspace_dir) / "projects"
                logger.info(f"Using HOST_WORKSPACE_DIR: {host_projects_dir}")
                return str(host_projects_dir)

            # Fallback for Docker-in-Docker
            logger.warning("Docker-in-Docker detected, using assumed host path: ./projects")
            return "./projects"

        # Running on host - find workspace root
        current_dir = Path.cwd()
        workspace_root = current_dir
        while workspace_root != Path("/") and not (workspace_root / "projects").exists():
            workspace_root = workspace_root.parent

        if (workspace_root / "projects").exists():
            return str(workspace_root / "projects")

        # Fallback - create projects directory
        projects_path = current_dir / "projects"
        projects_path.mkdir(parents=True, exist_ok=True)
        return str(projects_path)

    async def is_docker_available(self) -> bool:
        """Check if Docker is available with timeout"""
        try:
            # Run in executor to avoid blocking
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

    def _prepare_container_environment(
        self, project_id: int, session_id: str, env_vars: dict[str, str]
    ) -> dict[str, str]:
        """Prepare environment variables for container"""
        db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
        return {
            "NODE_ENV": "development",
            "PORT": "3000",
            "POSTGRES_URL": (
                f"postgres://postgres:{db_password}@postgres:5432/kosuke_project_{project_id}_session_{session_id}"
            ),
            **env_vars,
        }

    async def _check_container_health(self, url: str, timeout: float = 2.0) -> bool:
        """Check if container is responding to HTTP requests with timeout"""
        try:
            import aiohttp

            # Convert localhost URL for Docker-in-Docker
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

    async def _ensure_session_database(self, project_id: int, session_id: str) -> None:
        """Ensure session has its own database (non-blocking)"""
        try:
            import asyncpg

            # Use timeout to prevent hanging
            db_password = os.getenv("POSTGRES_PASSWORD", "postgres")

            conn = await asyncio.wait_for(
                asyncpg.connect(host="postgres", port=5432, user="postgres", password=db_password, database="postgres"),
                timeout=10.0,
            )

            try:
                db_name = f"kosuke_project_{project_id}_session_{session_id}"

                # Check if database exists first
                result = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", db_name)

                if result:
                    logger.debug(f"Database for project {project_id} session {session_id} already exists")
                else:
                    await asyncio.wait_for(conn.execute(f'CREATE DATABASE "{db_name}"'), timeout=5.0)
                    logger.info(f"Created database for project {project_id} session {session_id}")
            except Exception as db_error:
                logger.error(f"Database operation error for project {project_id} session {session_id}: {db_error}")
            finally:
                await conn.close()

        except asyncio.TimeoutError:
            logger.error(f"Database creation timeout for project {project_id} session {session_id}")
        except Exception as e:
            logger.error(f"Error creating database for project {project_id} session {session_id}: {e}")

    async def _get_existing_container(self, container_name: str) -> dict | None:
        """Get existing container info in executor to avoid blocking"""
        try:
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(None, self.client.containers.get, container_name), timeout=5.0
            )

            logger.info(f"Found existing container {container_name} with status: {container.status}")

            if container.status == "running":
                # Container is running, get port info
                ports = container.ports
                if "3000/tcp" in ports and ports["3000/tcp"]:
                    host_port = int(ports["3000/tcp"][0]["HostPort"])
                    return {"container": container, "host_port": host_port, "url": f"http://localhost:{host_port}"}
                logger.warning(f"Running container {container_name} has no port mapping")
            elif container.status in ["created", "exited", "dead"]:
                # Container exists but not running, try to start it
                logger.info(f"Attempting to start existing container {container_name}")
                try:
                    await asyncio.wait_for(loop.run_in_executor(None, container.start), timeout=10.0)

                    # Reload container to get updated status and ports
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

                # If starting failed, remove the container so we can create a new one
                logger.info(f"Removing failed container {container_name}")
                await asyncio.wait_for(loop.run_in_executor(None, lambda: container.remove(force=True)), timeout=5.0)

        except (NotFound, asyncio.TimeoutError):
            # Container doesn't exist or timeout
            logger.debug(f"Container {container_name} not found or timeout")
        except Exception as e:
            logger.error(f"Error checking existing container {container_name}: {e}")

        return None

    async def _handle_existing_container(
        self, project_id: int, session_id: str, container_name: str, git_status: dict | None = None
    ) -> str | None:
        """Handle existing container if found"""
        container_key = (project_id, session_id)

        # Check if container already exists in memory
        if container_key in self.containers:
            container_info = self.containers[container_key]
            # Update git status for existing container in memory
            if git_status:
                container_info.git_status = GitUpdateStatus(**git_status)
            return container_info.url

        # Check for existing Docker container
        existing = await self._get_existing_container(container_name)
        if existing:
            # Convert git_status dict to GitUpdateStatus model if present
            git_update_status = None
            if git_status:
                git_update_status = GitUpdateStatus(**git_status)

            container_info = ContainerInfo(
                project_id=project_id,
                session_id=session_id,
                container_id=existing["container"].id,
                container_name=container_name,
                port=existing["host_port"],
                url=existing["url"],
                compilation_complete=True,
                git_status=git_update_status,  # Include git status for existing containers
            )
            self.containers[container_key] = container_info
            return existing["url"]

        return None

    def _get_host_session_path(self, project_id: int, session_id: str) -> Path:
        """Get the host path for the session"""
        if session_id == "main":
            # For main branch, use the main project directory
            session_path = Path(self.host_projects_dir) / str(project_id)
        else:
            # For chat sessions, use the session subdirectory
            session_path = Path(self.host_projects_dir) / str(project_id) / "sessions" / session_id

        # Ensure we return an absolute path
        return session_path.resolve()

    async def _ensure_session_environment(self, project_id: int, session_id: str) -> dict | None:
        """
        Ensure session environment exists and update main branch if needed.
        Returns git pull status for main branch updates.
        """
        git_status = None

        try:
            session_path = self.session_manager.get_session_path(project_id, session_id)
            if not self.session_manager.validate_session_directory(project_id, session_id):
                if session_id == "main":
                    # For main branch, we expect the main project directory to exist
                    logger.error(f"Main project directory does not exist or is invalid: {session_path}")
                    raise Exception(f"Main project directory not found: {session_path}")
                # For chat sessions, create the session environment
                logger.info(f"Creating session environment for {session_id}")
                self.session_manager.create_session_environment(project_id, session_id)

        except Exception as e:
            logger.error(f"Failed to create/validate session environment: {e}")
            raise Exception(f"Session environment setup failed: {e}") from e

        return git_status

    async def _create_new_container(
        self,
        project_id: int,
        session_id: str,
        container_name: str,
        env_vars: dict[str, str],
        git_status: dict | None = None,
    ) -> str:
        """Create a new container for the session"""
        host_session_path = self._get_host_session_path(project_id, session_id)

        # Validate that we have an absolute path
        if not host_session_path.is_absolute():
            error_msg = f"Host session path must be absolute, got: {host_session_path}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        logger.info(
            f"Mounting host path {host_session_path} to container /app for project {project_id} session {session_id}"
        )

        environment = self._prepare_container_environment(project_id, session_id, env_vars)

        # Ensure the preview image is available before creating container
        await self._ensure_preview_image()

        # Determine if we're using Traefik or traditional port mapping
        if settings.TRAEFIK_ENABLED:
            # Use Traefik routing - no port mapping needed
            ports = {}
            network = "kosuke_network"

            # Generate subdomain for this container (use session_id as branch for now)
            # In a real implementation, you'd extract the actual branch name
            branch_name = session_id  # Fallback to session_id as branch identifier
            project_domain = self.domain_service.generate_subdomain(project_id, branch_name)

            # Add Traefik labels for automatic routing
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
            # Traditional port mapping for development
            host_port = self._get_random_port()
            ports = {"3000/tcp": host_port}
            network = "kosuke_network"
            labels = {
                "kosuke.project_id": str(project_id),
                "kosuke.session_id": session_id,
                "kosuke.branch": session_id,
            }
            url = f"http://localhost:{host_port}"

        logger.info(
            f"Mounting host path {host_session_path} to container /app for project {project_id} session {session_id}"
        )

        # Run container creation in executor with timeout
        # loop = asyncio.get_event_loop()
        # container = await asyncio.wait_for(
        #     loop.run_in_executor(
        #         None,
        #         lambda: self.client.containers.run(
        #             image=settings.preview_default_image,
        #             name=container_name,
        #             command=None,
        #             ports=ports,
        #             volumes={str(host_session_path): {"bind": "/app", "mode": "rw"}},
        #             working_dir="/app",
        #             environment=environment,
        #             network=network,
        #             labels=labels,
        #             detach=True,
        #             auto_remove=False,
        #         ),
        #     ),
        #     timeout=30.0,
        # )

        # # Convert git_status dict to GitUpdateStatus model if present
        # git_update_status = None
        # if git_status:
        #     git_update_status = GitUpdateStatus(**git_status)

        # container_info = ContainerInfo(
        #     project_id=project_id,
        #     session_id=session_id,
        #     container_id=container.id,
        #     container_name=container_name,
        #     port=host_port if not settings.TRAEFIK_ENABLED else 3000,  # Use 3000 for Traefik, actual port for direct
        #     url=url,
        #     compilation_complete=False,
        #     git_status=git_update_status,
        # )

        # container_key = (project_id, session_id)
        # self.containers[container_key] = container_info

        # # Start compilation monitoring without blocking
        # _monitor_task = asyncio.create_task(self._monitor_compilation_async(project_id, session_id))

        return url

    async def _handle_container_conflict(self, project_id: int, session_id: str, container_name: str) -> str | None:
        """Handle container name conflict by trying to recover existing container"""
        logger.info(
            f"Container name conflict for project {project_id} session {session_id}, "
            "attempting to recover existing container"
        )
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
                git_status=None,  # No git status for conflict recovery
            )
            container_key = (project_id, session_id)
            self.containers[container_key] = container_info
            return existing["url"]
        raise Exception("Failed to recover from container conflict")

    async def start_preview(self, project_id: int, session_id: str, env_vars: dict[str, str] | None = None) -> str:
        """Start preview container for project session (non-blocking)"""
        if env_vars is None:
            env_vars = {}

        container_name = self._get_container_name(project_id, session_id)

        # Always ensure session environment and get git status (even for existing containers)
        git_status = await self._ensure_session_environment(project_id, session_id)

        # Check for existing containers
        existing_url = await self._handle_existing_container(project_id, session_id, container_name, git_status)
        if existing_url:
            return existing_url

        # Ensure session database (don't wait for it to complete)
        _db_task = asyncio.create_task(self._ensure_session_database(project_id, session_id))

        try:
            return await self._create_new_container(
                project_id, session_id, container_name, env_vars, git_status=git_status
            )
        except asyncio.TimeoutError:
            logger.error(f"Container creation timeout for project {project_id} session {session_id}")
            raise Exception("Container creation timeout") from None
        except Exception as e:
            logger.error(f"Failed to create container for project {project_id} session {session_id}: {e}")

            # If it's a container name conflict, try to recover the existing container
            if "Conflict" in str(e) and "already in use" in str(e):
                return await self._handle_container_conflict(project_id, session_id, container_name)

            raise Exception(f"Failed to create container: {e}") from e

    async def _monitor_compilation_async(self, project_id: int, session_id: str) -> None:
        """Monitor compilation in a non-blocking way with timeout"""
        try:
            container_key = (project_id, session_id)
            if container_key not in self.containers:
                return

            container_info = self.containers[container_key]

            # Wait for container to be responsive (max 60 seconds)
            start_time = asyncio.get_event_loop().time()
            timeout = 60.0

            while (asyncio.get_event_loop().time() - start_time) < timeout:
                if await self._check_container_health(container_info.url, timeout=1.0):
                    # Container is responding, mark as complete
                    if container_key in self.containers:
                        self.containers[container_key].compilation_complete = True
                        logger.info(f"Project {project_id} session {session_id} compilation completed and responsive")
                    return

                # Wait 2 seconds before next check
                await asyncio.sleep(2.0)

            logger.warning(f"Project {project_id} session {session_id} compilation monitoring timeout after {timeout}s")

        except Exception as e:
            logger.error(f"Error monitoring compilation for project {project_id} session {session_id}: {e}")

    async def stop_preview(self, project_id: int, session_id: str) -> None:
        """Stop preview container for project session (non-blocking)"""
        container_key = (project_id, session_id)
        if container_key not in self.containers:
            return

        container_info = self.containers[container_key]

        try:
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(None, self.client.containers.get, container_info.container_id), timeout=5.0
            )

            # Stop and remove container
            await asyncio.wait_for(loop.run_in_executor(None, lambda: container.stop(timeout=5)), timeout=10.0)
            await asyncio.wait_for(loop.run_in_executor(None, lambda: container.remove(force=True)), timeout=5.0)

        except (NotFound, asyncio.TimeoutError):
            # Container already removed or timeout
            pass
        except Exception as e:
            logger.error(f"Error stopping container for project {project_id} session {session_id}: {e}")
        finally:
            # Always remove from memory
            if container_key in self.containers:
                del self.containers[container_key]

    async def get_preview_status(self, project_id: int, session_id: str) -> PreviewStatus:
        """Get preview status for project session (non-blocking)"""
        container_key = (project_id, session_id)

        # Check if we have container info in memory
        if container_key not in self.containers:
            # Try to detect existing Docker container
            existing = await self._get_existing_container(self._get_container_name(project_id, session_id))
            if existing:
                # Skip automatic git update for recovered containers - user will manually pull when needed
                git_status = None
                # Restore container info to memory
                container_info = ContainerInfo(
                    project_id=project_id,
                    session_id=session_id,
                    container_id=existing["container"].id,
                    container_name=self._get_container_name(project_id, session_id),
                    port=existing["host_port"],
                    url=existing["url"],
                    compilation_complete=True,  # Assume running container is compiled
                    git_status=git_status,  # Include git status for main branch
                )
                self.containers[container_key] = container_info

                # Check if container is responding
                is_responding = await self._check_container_health(existing["url"])

                return PreviewStatus(
                    running=True,
                    url=existing["url"],
                    compilation_complete=True,
                    is_responding=is_responding,
                    git_status=git_status,
                )

            # No container found
            return PreviewStatus(
                running=False, url=None, compilation_complete=False, is_responding=False, git_status=None
            )

        container_info = self.containers[container_key]

        # Check if container is responding
        is_responding = await self._check_container_health(container_info.url)

        return PreviewStatus(
            running=True,
            url=container_info.url,
            compilation_complete=container_info.compilation_complete,
            is_responding=is_responding,
            git_status=container_info.git_status,
        )

    async def stop_all_previews(self) -> None:
        """Stop all preview containers (non-blocking)"""
        container_keys = list(self.containers.keys())

        # Stop all containers concurrently
        tasks = [self.stop_preview(project_id, session_id) for project_id, session_id in container_keys]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def pull_branch(self, project_id: int, session_id: str, force: bool = False) -> dict:
        """Pull latest changes for a project branch or session branch"""
        try:
            if session_id == "main":
                # For main branch, use the session manager's pull method but remove caching
                return await self.session_manager.pull_main_branch(project_id, force=force)
            # For session branches, pull the specific session branch
            return await self.session_manager.pull_session_branch(project_id, session_id, force=force)
        except Exception as e:
            logger.error(f"Error pulling branch for project {project_id} session {session_id}: {e}")
            raise

    async def is_container_running(self, project_id: int, session_id: str) -> bool:
        """Check if a container is currently running"""
        container_key = (project_id, session_id)
        if container_key not in self.containers:
            return False

        container_info = self.containers[container_key]
        try:
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(None, self.client.containers.get, container_info.container_id), timeout=5.0
            )
            return container.status == "running"
        except (NotFound, asyncio.TimeoutError):
            return False
        except Exception as e:
            logger.error(f"Error checking container status: {e}")
            return False

    async def restart_preview_container(self, project_id: int, session_id: str) -> None:
        """Restart a preview container to apply pulled changes"""
        container_key = (project_id, session_id)
        if container_key not in self.containers:
            logger.warning(f"Container not found for project {project_id} session {session_id}")
            return

        container_info = self.containers[container_key]
        try:
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(None, self.client.containers.get, container_info.container_id), timeout=5.0
            )

            # Restart the container to apply changes
            logger.info(f"Restarting container for project {project_id} session {session_id}")
            await asyncio.wait_for(loop.run_in_executor(None, container.restart), timeout=30.0)

            # Reset compilation status since container restarted
            self.containers[container_key].compilation_complete = False

            # Start monitoring compilation again
            _monitor_task = asyncio.create_task(self._monitor_compilation_async(project_id, session_id))

            logger.info(f"Container restarted successfully for project {project_id} session {session_id}")

        except (NotFound, asyncio.TimeoutError):
            logger.error(f"Container not found or timeout when restarting project {project_id} session {session_id}")
        except Exception as e:
            logger.error(f"Error restarting container for project {project_id} session {session_id}: {e}")
            raise

    async def get_project_preview_urls(self, project_id: int) -> dict:
        """Get all preview URLs for a project"""
        try:
            preview_urls = self.domain_service.get_preview_urls_for_project(project_id)
            return {"preview_urls": preview_urls, "total_count": len(preview_urls)}
        except Exception as e:
            logger.error(f"Error getting preview URLs for project {project_id}: {e}")
            return {"preview_urls": [], "total_count": 0}
