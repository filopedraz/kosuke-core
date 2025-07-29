import asyncio
import logging
import os
import secrets
from pathlib import Path
from typing import Optional

import docker
from docker.errors import NotFound

from app.models.preview import ContainerInfo
from app.models.preview import PreviewStatus
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
            raise RuntimeError(f"Docker client initialization failed: {e}")

        self.containers: dict[int, ContainerInfo] = {}
        self.CONTAINER_NAME_PREFIX = "kosuke-preview-"

        # Determine the correct host projects directory
        self.host_projects_dir = self._get_host_projects_dir()
        logger.info(f"DockerService initialized with host projects directory: {self.host_projects_dir}")

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

    def _get_container_name(self, project_id: int) -> str:
        """Generate container name for project"""
        return f"{self.CONTAINER_NAME_PREFIX}{project_id}"

    def _prepare_container_environment(self, project_id: int, env_vars: dict[str, str]) -> dict[str, str]:
        """Prepare environment variables for container"""
        db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
        return {
            "NODE_ENV": "development",
            "PORT": "3000",
            "DATABASE_URL": f"postgres://postgres:{db_password}@postgres:5432/kosuke_project_{project_id}",
            **env_vars,
        }

    async def _check_container_health(self, url: str, timeout: float = 2.0) -> bool:
        """Check if container is responding to HTTP requests with timeout"""
        try:
            import aiohttp

            # Convert localhost URL for Docker-in-Docker
            health_check_url = url.replace("localhost", "host.docker.internal")

            timeout_config = aiohttp.ClientTimeout(total=timeout)
            async with aiohttp.ClientSession(timeout=timeout_config) as session:
                async with session.get(health_check_url) as response:
                    return response.status == 200
        except Exception as e:
            logger.debug(f"Health check failed for {url}: {e}")
            return False

    async def _ensure_project_database(self, project_id: int) -> None:
        """Ensure project has its own database (non-blocking)"""
        try:
            import asyncpg

            # Use timeout to prevent hanging
            db_password = os.getenv("POSTGRES_PASSWORD", "postgres")

            conn = await asyncio.wait_for(
                asyncpg.connect(host="postgres", port=5432, user="postgres", password=db_password, database="postgres"),
                timeout=10.0,
            )

            try:
                db_name = f"kosuke_project_{project_id}"
                await asyncio.wait_for(conn.execute(f'CREATE DATABASE "{db_name}"'), timeout=5.0)
                logger.info(f"Created database for project {project_id}")
            except asyncpg.exceptions.DuplicateDatabaseError:
                logger.debug(f"Database for project {project_id} already exists")
            finally:
                await conn.close()

        except asyncio.TimeoutError:
            logger.error(f"Database creation timeout for project {project_id}")
        except Exception as e:
            logger.error(f"Error creating database for project {project_id}: {e}")

    async def _get_existing_container(self, container_name: str) -> Optional[dict]:
        """Get existing container info in executor to avoid blocking"""
        try:
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(None, self.client.containers.get, container_name), timeout=5.0
            )

            if container.status == "running":
                ports = container.ports
                if "3000/tcp" in ports and ports["3000/tcp"]:
                    host_port = int(ports["3000/tcp"][0]["HostPort"])
                    return {"container": container, "host_port": host_port, "url": f"http://localhost:{host_port}"}
            else:
                # Container exists but not running, remove it
                await asyncio.wait_for(loop.run_in_executor(None, container.remove, True), timeout=5.0)

        except (NotFound, asyncio.TimeoutError):
            # Container doesn't exist or timeout
            pass
        except Exception as e:
            logger.error(f"Error checking existing container {container_name}: {e}")

        return None

    async def start_preview(self, project_id: int, env_vars: Optional[dict[str, str]] = None) -> str:
        """Start preview container for project (non-blocking)"""
        if env_vars is None:
            env_vars = {}

        container_name = self._get_container_name(project_id)

        # Check if container already exists in memory
        if project_id in self.containers:
            container_info = self.containers[project_id]
            return container_info.url

        # Check for existing Docker container
        existing = await self._get_existing_container(container_name)
        if existing:
            container_info = ContainerInfo(
                project_id=project_id,
                container_id=existing["container"].id,
                container_name=container_name,
                port=existing["host_port"],
                url=existing["url"],
                compilation_complete=True,
            )
            self.containers[project_id] = container_info
            return existing["url"]

        # Ensure project database (don't wait for it to complete)
        asyncio.create_task(self._ensure_project_database(project_id))

        # Create new container
        host_port = self._get_random_port()
        host_project_path = Path(self.host_projects_dir) / str(project_id)
        host_project_path.mkdir(parents=True, exist_ok=True)

        logger.info(f"Mounting host path {host_project_path} to container /app for project {project_id}")

        environment = self._prepare_container_environment(project_id, env_vars)

        try:
            # Run container creation in executor with timeout
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self.client.containers.run(
                        image=settings.preview_default_image,
                        name=container_name,
                        command=None,
                        ports={"3000/tcp": host_port},
                        volumes={str(host_project_path): {"bind": "/app", "mode": "rw"}},
                        working_dir="/app",
                        environment=environment,
                        network="kosuke-core_default",
                        detach=True,
                        auto_remove=False,
                    ),
                ),
                timeout=30.0,
            )

            url = f"http://localhost:{host_port}"
            container_info = ContainerInfo(
                project_id=project_id,
                container_id=container.id,
                container_name=container_name,
                port=host_port,
                url=url,
                compilation_complete=False,
            )

            self.containers[project_id] = container_info

            # Start compilation monitoring without blocking
            asyncio.create_task(self._monitor_compilation_async(project_id))

            return url

        except asyncio.TimeoutError:
            logger.error(f"Container creation timeout for project {project_id}")
            raise Exception("Container creation timeout")
        except Exception as e:
            logger.error(f"Failed to create container for project {project_id}: {e}")
            raise Exception(f"Failed to create container: {e}")

    async def _monitor_compilation_async(self, project_id: int) -> None:
        """Monitor compilation in a non-blocking way with timeout"""
        try:
            if project_id not in self.containers:
                return

            container_info = self.containers[project_id]

            # Wait for container to be responsive (max 60 seconds)
            start_time = asyncio.get_event_loop().time()
            timeout = 60.0

            while (asyncio.get_event_loop().time() - start_time) < timeout:
                if await self._check_container_health(container_info.url, timeout=1.0):
                    # Container is responding, mark as complete
                    if project_id in self.containers:
                        self.containers[project_id].compilation_complete = True
                        logger.info(f"Project {project_id} compilation completed and responsive")
                    return

                # Wait 2 seconds before next check
                await asyncio.sleep(2.0)

            logger.warning(f"Project {project_id} compilation monitoring timeout after {timeout}s")

        except Exception as e:
            logger.error(f"Error monitoring compilation for project {project_id}: {e}")

    async def stop_preview(self, project_id: int) -> None:
        """Stop preview container for project (non-blocking)"""
        if project_id not in self.containers:
            return

        container_info = self.containers[project_id]

        try:
            loop = asyncio.get_event_loop()
            container = await asyncio.wait_for(
                loop.run_in_executor(None, self.client.containers.get, container_info.container_id), timeout=5.0
            )

            # Stop and remove container
            await asyncio.wait_for(loop.run_in_executor(None, container.stop, 5), timeout=10.0)
            await asyncio.wait_for(loop.run_in_executor(None, container.remove, True), timeout=5.0)

        except (NotFound, asyncio.TimeoutError):
            # Container already removed or timeout
            pass
        except Exception as e:
            logger.error(f"Error stopping container for project {project_id}: {e}")
        finally:
            # Always remove from memory
            if project_id in self.containers:
                del self.containers[project_id]

    async def get_preview_status(self, project_id: int) -> PreviewStatus:
        """Get preview status for project (non-blocking)"""
        # Check if we have container info in memory
        if project_id not in self.containers:
            # Try to detect existing Docker container
            existing = await self._get_existing_container(self._get_container_name(project_id))
            if existing:
                # Restore container info to memory
                container_info = ContainerInfo(
                    project_id=project_id,
                    container_id=existing["container"].id,
                    container_name=self._get_container_name(project_id),
                    port=existing["host_port"],
                    url=existing["url"],
                    compilation_complete=True,  # Assume running container is compiled
                )
                self.containers[project_id] = container_info

                # Check if container is responding
                is_responding = await self._check_container_health(existing["url"])

                return PreviewStatus(
                    running=True,
                    url=existing["url"],
                    compilation_complete=True,
                    is_responding=is_responding,
                )

            # No container found
            return PreviewStatus(running=False, url=None, compilation_complete=False, is_responding=False)

        container_info = self.containers[project_id]

        # Check if container is responding
        is_responding = await self._check_container_health(container_info.url)

        return PreviewStatus(
            running=True,
            url=container_info.url,
            compilation_complete=container_info.compilation_complete,
            is_responding=is_responding,
        )

    async def stop_all_previews(self) -> None:
        """Stop all preview containers (non-blocking)"""
        project_ids = list(self.containers.keys())

        # Stop all containers concurrently
        tasks = [self.stop_preview(project_id) for project_id in project_ids]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
