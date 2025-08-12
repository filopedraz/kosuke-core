import secrets
from typing import Protocol

from app.services.domain_service import DomainService


class BaseRouterAdapter(Protocol):
    def prepare_run(self, project_id: int, session_id: str, container_name: str) -> tuple[dict, dict, str, int]:
        """
        Prepare container run configuration.
        Returns: (ports, labels, url, host_port)
        - For Traefik: ports = {}, host_port = 3000, url = https://{domain}
        - For Port mapping: ports = {"3000/tcp": host_port}, url = http://localhost:{host_port}
        """
        ...


class PortRouterAdapter:
    def __init__(self, port_range_start: int, port_range_end: int):
        self.port_range_start = port_range_start
        self.port_range_end = port_range_end

    def _pick_random_port(self) -> int:
        return secrets.randbelow(self.port_range_end - self.port_range_start + 1) + self.port_range_start

    def prepare_run(self, project_id: int, session_id: str, container_name: str) -> tuple[dict, dict, str, int]:
        host_port = self._pick_random_port()
        ports = {"3000/tcp": host_port}
        labels = {
            "kosuke.project_id": str(project_id),
            "kosuke.session_id": session_id,
            "kosuke.branch": session_id,
        }
        url = f"http://localhost:{host_port}"
        return ports, labels, url, host_port


class TraefikRouterAdapter:
    def __init__(self, domain_service: DomainService):
        self.domain_service = domain_service

    def prepare_run(self, project_id: int, session_id: str, container_name: str) -> tuple[dict, dict, str, int]:
        # session_id acts as branch name in our previews
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
        # For Traefik, we standardize on container internal port 3000
        return {}, labels, url, 3000
