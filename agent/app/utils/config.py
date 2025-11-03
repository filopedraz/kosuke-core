import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


class Settings:
    """Application settings loaded from environment variables"""

    def __init__(self):
        # Basic settings
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO")
        self.max_iterations: int = int(os.getenv("MAX_ITERATIONS", "25"))
        self.temperature: float = float(os.getenv("TEMPERATURE", "0.7"))
        self.max_tokens: int = int(os.getenv("MAX_TOKENS", "4000"))

        # Paths
        self.projects_dir: str = os.getenv("PROJECTS_DIR", "projects")

        # Model settings - Claude 3.7 supports thinking blocks
        self.model_name: str = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")
        self.anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

        # Preview settings
        self.preview_default_image: str = os.getenv(
            "PREVIEW_DEFAULT_IMAGE", "ghcr.io/filopedraz/kosuke-template:v0.0.80"
        )
        self.preview_port_range_start: int = int(os.getenv("PREVIEW_PORT_RANGE_START", "3001"))
        self.preview_port_range_end: int = int(os.getenv("PREVIEW_PORT_RANGE_END", "3100"))
        # Router mode: 'port' for local host port mapping, 'traefik' for Traefik-based routing
        traefik_enabled = os.getenv("TRAEFIK_ENABLED", "false").lower() == "true"
        default_router_mode = "traefik" if traefik_enabled else "port"
        self.router_mode: str = os.getenv("ROUTER_MODE", default_router_mode).lower()
        # Health path probed to determine readiness
        self.preview_health_path: str = os.getenv("PREVIEW_HEALTH_PATH", "/")
        # Docker network name used to attach preview containers
        self.preview_network: str = os.getenv("PREVIEW_NETWORK", "kosuke_network")
        # Container name prefix for preview containers
        self.preview_container_name_prefix: str = os.getenv("PREVIEW_CONTAINER_NAME_PREFIX", "kosuke-preview-")

        # Template repository settings
        self.template_repository: str = os.getenv("TEMPLATE_REPOSITORY", "filopedraz/kosuke-template")

        # Database settings
        self.postgres_host: str = os.getenv("POSTGRES_HOST", "postgres")
        self.postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
        self.postgres_db: str = os.getenv("POSTGRES_DB", "postgres")
        self.postgres_user: str = os.getenv("POSTGRES_USER", "postgres")
        self.postgres_password: str = os.getenv("POSTGRES_PASSWORD", "postgres")

        # Processing settings
        self.processing_timeout: int = int(os.getenv("PROCESSING_TIMEOUT", "90000"))

        # Webhook settings
        self.nextjs_url: str = os.getenv("NEXTJS_URL", "http://localhost:3000")
        self.webhook_secret: str = os.getenv("WEBHOOK_SECRET", "dev-secret-change-in-production")

        # Domain settings (lower_snake_case for consistency)
        self.main_domain: str = os.getenv("MAIN_DOMAIN", "kosuke.ai")
        self.preview_base_domain: str = os.getenv("PREVIEW_BASE_DOMAIN", "kosuke.app")
        self.traefik_enabled: bool = os.getenv("TRAEFIK_ENABLED", "false").lower() == "true"

        # Docker-in-Docker settings
        self.host_workspace_dir: str = os.getenv("HOST_WORKSPACE_DIR", "")

        # Git settings
        self.git_pull_cache_minutes: int = int(os.getenv("GIT_PULL_CACHE_MINUTES", "60"))
        # Branch naming for chat sessions (used by GitHubService)
        # Example default: kosuke/chat-<sessionId>
        self.session_branch_prefix: str = os.getenv("SESSION_BRANCH_PREFIX", "kosuke/chat-")

    def validate_settings(self) -> bool:
        """Validate required settings"""
        if not self.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required")

        if self.max_tokens <= 0:
            raise ValueError("MAX_TOKENS must be greater than 0")

        return True

    def to_dict(self) -> dict[str, Any]:
        """Convert settings to dictionary for debugging"""
        return {
            "log_level": self.log_level,
            "max_iterations": self.max_iterations,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "projects_dir": self.projects_dir,
            "model_name": self.model_name,
            "anthropic_api_key": "***" if self.anthropic_api_key else "",
            "preview_default_image": self.preview_default_image,
            "template_repository": self.template_repository,
            "preview_port_range_start": self.preview_port_range_start,
            "preview_port_range_end": self.preview_port_range_end,
            "router_mode": self.router_mode,
            "preview_health_path": self.preview_health_path,
            "preview_network": self.preview_network,
            "preview_container_name_prefix": self.preview_container_name_prefix,
            "postgres_host": self.postgres_host,
            "postgres_port": self.postgres_port,
            "postgres_db": self.postgres_db,
            "postgres_user": self.postgres_user,
            "postgres_password": "***" if self.postgres_password else "",
            "processing_timeout": self.processing_timeout,
            "nextjs_url": self.nextjs_url,
            "webhook_secret": "***" if self.webhook_secret else "",
            "main_domain": self.main_domain,
            "preview_base_domain": self.preview_base_domain,
            "traefik_enabled": self.traefik_enabled,
            "host_workspace_dir": self.host_workspace_dir,
            "git_pull_cache_minutes": self.git_pull_cache_minutes,
        }


# Global settings instance
settings = Settings()

# Validate settings on import
try:
    settings.validate_settings()
    logger.info("✅ Configuration loaded successfully")
    logger.info(f"   - Log level: {settings.log_level}")
    logger.info(f"   - Max iterations: {settings.max_iterations}")
    logger.info(f"   - Projects directory: {settings.projects_dir}")
    logger.info(f"   - Model: {settings.model_name}")
    logger.info(f"   - Preview image: {settings.preview_default_image}")
    logger.info(f"   - Template repository: {settings.template_repository}")
except ValueError as e:
    logger.error(f"❌ Configuration error: {e}")
    logger.error("   Please check your environment variables in config.env or .env")
except Exception as e:
    logger.warning(f"⚠️ Configuration warning: {e}")
    logger.warning("   Some settings may use default values")
