import asyncio
import logging
import os
import secrets

import docker

from app.models.preview import ContainerInfo
from app.models.preview import PreviewStatus
from app.utils.config import settings

logger = logging.getLogger(__name__)


class DockerService:
    def __init__(self):
        self.client = docker.from_env()
        self.containers: dict[int, ContainerInfo] = {}
        self.CONTAINER_NAME_PREFIX = "kosuke-preview-"

    async def is_docker_available(self) -> bool:
        """Check if Docker is available"""
        try:
            self.client.ping()
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
            pass
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
            else:
                # Container exists but not running, remove it
                existing_container.remove(force=True)
        except docker.errors.NotFound:
            # Container doesn't exist, which is fine
            pass

        # Ensure project has its own database
        await self._ensure_project_database(project_id)

        # Create new container
        host_port = self._get_random_port()
        project_path = f"{settings.projects_dir}/{project_id}"

        # Prepare container environment
        environment = self._prepare_container_environment(project_id, env_vars)

        container = self.client.containers.run(
            image=settings.preview_default_image,  # Use the kosuke-template image
            name=container_name,
            command=["sh", "-c", "cd /app && npm run dev -- -H 0.0.0.0"],
            ports={"3000/tcp": host_port},
            volumes={project_path: {"bind": "/app", "mode": "rw"}},
            working_dir="/app",
            environment=environment,
            network="kosuke_default",  # Connect to kosuke network for postgres access
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
        if project_id not in self.containers:
            return PreviewStatus(running=False, url=None, compilation_complete=False, is_responding=False)

        container_info = self.containers[project_id]

        # Check if container is responding
        is_responding = False
        try:
            import aiohttp

            async with aiohttp.ClientSession() as session, session.get(container_info.url, timeout=5) as response:
                is_responding = response.status == 200
        except (aiohttp.ClientError, asyncio.TimeoutError):
            is_responding = False

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
