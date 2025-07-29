import asyncio
import logging
import os
import secrets
import shutil
import subprocess
from pathlib import Path

import docker

from app.models.preview import ContainerInfo
from app.models.preview import PreviewStatus
from app.utils.config import settings

logger = logging.getLogger(__name__)


class DockerService:
    def __init__(self):
        # Use subprocess for basic operations since Python SDK has issues with OrbStack
        self.use_cli = True
        try:
            # Try to initialize Docker client, but don't fail if it doesn't work
            self.client = docker.from_env()
        except Exception as e:
            logger.warning(f"Docker Python SDK not available, will use CLI: {e}")
            self.client = None

        self.containers: dict[int, ContainerInfo] = {}
        self.CONTAINER_NAME_PREFIX = "kosuke-preview-"

        # Resolve docker path once during initialization
        self.docker_path = shutil.which("docker")
        if not self.docker_path:
            raise RuntimeError("Docker executable not found in PATH")

        # Determine the correct host projects directory
        self.host_projects_dir = self._get_host_projects_dir()
        logger.info(f"DockerService initialized with host projects directory: {self.host_projects_dir}")

        # Log Docker-in-Docker detection
        if Path("/.dockerenv").exists() and Path("/var/run/docker.sock").exists():
            logger.info("Docker-in-Docker setup detected")
        elif Path("/.dockerenv").exists():
            logger.info("Running in container (but not Docker-in-Docker)")
        else:
            logger.info("Running on host")

    def _get_host_projects_dir(self) -> str:
        """Get the correct host path for projects directory"""
        # In Docker-in-Docker setup, we need to map container paths back to host paths
        # The agent container has: ./projects:/app/projects (from docker-compose.yml)
        # So /app/projects in the agent maps to ./projects on the host

        # Check if we're running in Docker-in-Docker (socket mounted + projects mounted)
        if Path("/.dockerenv").exists() and Path("/var/run/docker.sock").exists():
            # We're in Docker-in-Docker setup
            # Check if HOST_WORKSPACE_DIR is provided (should be absolute host path)
            host_workspace_dir = os.getenv("HOST_WORKSPACE_DIR")
            if host_workspace_dir:
                host_projects_dir = Path(host_workspace_dir) / "projects"
                logger.info(f"Using HOST_WORKSPACE_DIR: {host_projects_dir}")
                return str(host_projects_dir)

            # Fallback: Try to determine host path from PWD or similar
            # In many Docker setups, PWD environment variable contains the host working directory
            current_working_dir = os.getenv("PWD")
            if current_working_dir and current_working_dir != "/app":
                # If PWD is set and different from container working dir, it might be host path
                host_projects_dir = Path(current_working_dir) / "projects"
                if Path("/app/projects").exists():  # Verify projects are mounted
                    logger.info(f"Using PWD-based host path: {host_projects_dir}")
                    return str(host_projects_dir)

            # Docker-in-Docker fallback: Use a path that assumes standard workspace structure
            # This assumes docker-compose is run from the workspace root
            potential_host_paths = [
                "/workspace/projects",  # If workspace is mounted to /workspace
                "/host/projects",  # If workspace is mounted to /host
            ]

            for path in potential_host_paths:
                # We can't check if these exist since they're on the host, not in our container
                # But we can check if our container-side mount exists
                if Path("/app/projects").exists():
                    logger.warning(f"Docker-in-Docker detected, assuming host path: {path}")
                    return path

            # Final fallback for Docker-in-Docker: assume relative to compose file location
            # This is a guess, but often docker-compose.yml is in workspace root
            logger.warning("Docker-in-Docker detected, using assumed host path: ./projects")
            return "./projects"

        # We're running on the host - use relative path from current working directory
        current_dir = Path.cwd()
        # Navigate up to find the workspace root (where projects/ directory exists)
        workspace_root = current_dir
        while workspace_root != Path("/") and not (workspace_root / "projects").exists():
            workspace_root = workspace_root.parent

        if (workspace_root / "projects").exists():
            return str(workspace_root / "projects")

        # Fallback - create projects directory relative to current working directory
        projects_path = current_dir / "projects"
        projects_path.mkdir(parents=True, exist_ok=True)
        return str(projects_path)

    async def _run_docker_command(self, command: list[str]) -> dict | str:
        """Run Docker CLI command and return result"""
        # Validate command contains only safe Docker subcommands
        if not command or not isinstance(command[0], str):
            raise ValueError("Invalid Docker command")

        try:
            # nosec: B603 - subprocess call is safe, commands are controlled by application
            result = subprocess.run([self.docker_path, *command], capture_output=True, text=True, check=True)  # nosec: B603
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            logger.error(f"Docker command failed: {e.stderr}")
            raise Exception(f"Docker command failed: {e.stderr}") from e

    async def is_docker_available(self) -> bool:
        """Check if Docker is available"""
        try:
            await self._run_docker_command(["version", "--format", "json"])
            return True
        except Exception as e:
            logger.error(f"Docker not available: {e}")
            return False

    def _get_random_port(self, min_port: int = 3000, max_port: int = 4000) -> int:
        """Get a random port in range"""
        return min_port + secrets.randbelow(max_port - min_port + 1)

    def _get_container_name(self, project_id: int) -> str:
        """Generate container name for project"""
        return f"{self.CONTAINER_NAME_PREFIX}{project_id}"

    async def _get_project_environment(self, project_id: int) -> dict[str, str]:
        """Get project-specific environment variables from database"""
        # TODO: Implement environment service integration
        return {}

    def _prepare_container_environment(self, project_id: int, env_vars: dict[str, str]) -> dict[str, str]:
        """Prepare environment variables for container"""
        db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
        return {
            "NODE_ENV": "development",
            "PORT": "3000",
            "DATABASE_URL": f"postgres://postgres:{db_password}@postgres:5432/kosuke_project_{project_id}",
            **env_vars,
        }

    async def _check_container_health(self, url: str) -> bool:
        """Check if container is responding to HTTP requests"""
        try:
            import aiohttp

            # Convert localhost URL to host.docker.internal for Docker-in-Docker
            health_check_url = url.replace("localhost", "host.docker.internal")

            # Use short timeout for status checks (1 second)
            timeout = aiohttp.ClientTimeout(total=1)
            async with aiohttp.ClientSession(timeout=timeout) as session, session.get(health_check_url) as response:
                return response.status == 200
        except (aiohttp.ClientError, asyncio.TimeoutError):
            return False

    async def _ensure_project_database(self, project_id: int) -> None:
        """Ensure project has its own database in postgres"""
        try:
            import asyncpg

            # Connect to postgres as admin
            db_password = os.getenv("POSTGRES_PASSWORD", "postgres")
            conn = await asyncpg.connect(
                host="postgres", port=5432, user="postgres", password=db_password, database="postgres"
            )

            # Create project database if it doesn't exist
            db_name = f"kosuke_project_{project_id}"
            await conn.execute(f"CREATE DATABASE {db_name}")

            await conn.close()
            logger.info(f"Created database for project {project_id}")

        except asyncpg.exceptions.DuplicateDatabaseError:
            # Database already exists, that's fine
            await conn.close()
        except Exception as e:
            logger.error(f"Error creating database for project {project_id}: {e}")
            # Don't fail the container start if database creation fails

    async def start_preview(self, project_id: int, env_vars: dict[str, str] | None = None) -> str:
        """Start preview container for project"""
        if env_vars is None:
            env_vars = {}
        container_name = self._get_container_name(project_id)

        # Check if container already exists
        if project_id in self.containers:
            container_info = self.containers[project_id]
            return container_info.url

        # Check for existing Docker container
        try:
            existing_container = self.client.containers.get(container_name)
            if existing_container.status == "running":
                # Container exists and running, extract port and reuse
                ports = existing_container.ports
                if "3000/tcp" in ports and ports["3000/tcp"]:
                    host_port = int(ports["3000/tcp"][0]["HostPort"])
                    url = f"http://localhost:{host_port}"

                    container_info = ContainerInfo(
                        project_id=project_id,
                        container_id=existing_container.id,
                        container_name=container_name,
                        port=host_port,
                        url=url,
                        compilation_complete=True,
                    )
                    self.containers[project_id] = container_info
                    return url
            # Container exists but not running, remove it
            existing_container.remove(force=True)
        except docker.errors.NotFound:
            # Container doesn't exist, which is fine
            pass

        # Ensure project has its own database
        await self._ensure_project_database(project_id)

        # Create new container
        host_port = self._get_random_port()

        # Use the correct host path for the project
        host_project_path = Path(self.host_projects_dir) / str(project_id)

        # Ensure the project directory exists on the host
        host_project_path.mkdir(parents=True, exist_ok=True)

        logger.info(f"Mounting host path {host_project_path} to container /app for project {project_id}")

        # Prepare container environment
        environment = self._prepare_container_environment(project_id, env_vars)

        container = self.client.containers.run(
            image=settings.preview_default_image,  # Use the enhanced kosuke-template image
            name=container_name,
            command=None,  # Use default entrypoint + CMD from image
            ports={"3000/tcp": host_port},
            volumes={str(host_project_path): {"bind": "/app", "mode": "rw"}},
            working_dir="/app",
            environment=environment,
            network="kosuke-core_default",  # Connect to kosuke-core network for postgres access
            detach=True,
            auto_remove=False,
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

        # Start monitoring compilation in background
        monitoring_task = asyncio.create_task(self._monitor_compilation(project_id, container))
        # Store reference to prevent garbage collection
        if not hasattr(self, "_monitoring_tasks"):
            self._monitoring_tasks = set()
        self._monitoring_tasks.add(monitoring_task)
        monitoring_task.add_done_callback(self._monitoring_tasks.discard)

        return url

    async def _monitor_compilation(self, project_id: int, container):
        """Monitor container logs for compilation completion"""
        try:
            for log in container.logs(stream=True, follow=True):
                log_str = log.decode("utf-8")
                if "compiled successfully" in log_str or "ready started server" in log_str:
                    if project_id in self.containers:
                        self.containers[project_id].compilation_complete = True
                    break
        except Exception as e:
            logger.error(f"Error monitoring compilation for project {project_id}: {e}")

    async def stop_preview(self, project_id: int) -> None:
        """Stop preview container for project"""
        if project_id not in self.containers:
            return

        container_info = self.containers[project_id]
        try:
            container = self.client.containers.get(container_info.container_id)
            container.stop(timeout=5)
            container.remove(force=True)
        except docker.errors.NotFound:
            pass  # Container already removed
        except Exception as e:
            logger.error(f"Error stopping container for project {project_id}: {e}")
        finally:
            del self.containers[project_id]

    async def get_preview_status(self, project_id: int) -> PreviewStatus:
        """Get preview status for project"""
        # Check if we have container info in memory
        if project_id not in self.containers:
            # Try to detect existing Docker container
            container_name = self._get_container_name(project_id)
            try:
                existing_container = self.client.containers.get(container_name)
                if existing_container.status == "running":
                    # Container exists and running, extract port and reconnect
                    ports = existing_container.ports
                    if "3000/tcp" in ports and ports["3000/tcp"]:
                        host_port = int(ports["3000/tcp"][0]["HostPort"])
                        url = f"http://localhost:{host_port}"

                        # Restore container info to memory
                        container_info = ContainerInfo(
                            project_id=project_id,
                            container_id=existing_container.id,
                            container_name=container_name,
                            port=host_port,
                            url=url,
                            compilation_complete=True,  # Assume running container is compiled
                        )
                        self.containers[project_id] = container_info

                        # Check if container is responding
                        is_responding = await self._check_container_health(url)

                        return PreviewStatus(
                            running=True,
                            url=url,
                            compilation_complete=True,
                            is_responding=is_responding,
                        )
            except docker.errors.NotFound:
                # Container doesn't exist
                pass
            except Exception as e:
                logger.error(f"Error checking existing container for project {project_id}: {e}")

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
        """Stop all preview containers"""
        project_ids = list(self.containers.keys())
        for project_id in project_ids:
            await self.stop_preview(project_id)
