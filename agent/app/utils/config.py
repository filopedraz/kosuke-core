import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


_langfuse_client = None


def initialize_langfuse(settings_instance):
    """
    Initialize Langfuse observability for native Anthropic SDK.

    Uses OpenTelemetry instrumentation for Anthropic API calls.

    Returns:
        Langfuse client or None if not available
    """
    global _langfuse_client  # noqa: PLW0603
    # Check if Langfuse settings are configured
    public_key = settings_instance.langfuse_public_key
    secret_key = settings_instance.langfuse_secret_key
    host = settings_instance.langfuse_host

    if not public_key or not secret_key:
        logger.info("📊 Langfuse observability disabled (missing credentials)")
        return None

    try:
        from langfuse import Langfuse

        logger.info(f"🔧 Creating Langfuse client for {host}")
        _langfuse_client = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            host=host,
        )
        logger.info("✅ Langfuse client created")
        return _langfuse_client

    except ImportError as e:
        logger.warning(f"⚠️ Missing Langfuse: {e}")
        logger.warning("💡 Install with: pip install langfuse")
        return None
    except Exception as e:
        logger.error("❌ Langfuse initialization failed:")
        logger.error(f"   Error: {e}")
        logger.error(f"   Type: {type(e).__name__}")
        logger.error(f"   Module: {getattr(type(e), '__module__', 'unknown')}")

        if hasattr(e, "args") and e.args:
            logger.error(f"   Args: {e.args}")
        if hasattr(e, "__dict__"):
            error_dict = {k: v for k, v in e.__dict__.items() if not k.startswith("_")}
            logger.error(f"   Attributes: {error_dict}")

        return None


def get_langfuse_client():
    """Get the initialized Langfuse client instance."""
    return _langfuse_client


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
        self.model_name: str = os.getenv("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")
        self.anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

        # Preview settings
        self.preview_default_image: str = os.getenv(
            "PREVIEW_DEFAULT_IMAGE", "ghcr.io/filopedraz/kosuke-template:v0.0.80"
        )
        self.preview_port_range_start: int = int(os.getenv("PREVIEW_PORT_RANGE_START", "3001"))
        self.preview_port_range_end: int = int(os.getenv("PREVIEW_PORT_RANGE_END", "3100"))

        # Template repository settings
        self.template_repository: str = os.getenv("TEMPLATE_REPOSITORY", "filopedraz/kosuke-template")

        # Database settings
        self.postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
        self.postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
        self.postgres_db: str = os.getenv("POSTGRES_DB", "kosuke")
        self.postgres_user: str = os.getenv("POSTGRES_USER", "postgres")
        self.postgres_password: str = os.getenv("POSTGRES_PASSWORD", "password")

        # Langfuse Observability (Optional)
        self.langfuse_public_key: str = os.getenv("LANGFUSE_PUBLIC_KEY", "")
        self.langfuse_secret_key: str = os.getenv("LANGFUSE_SECRET_KEY", "")
        self.langfuse_host: str = os.getenv("LANGFUSE_HOST", "https://langfuse.joandko.io")

        # Processing settings
        self.processing_timeout: int = int(os.getenv("PROCESSING_TIMEOUT", "90000"))

        # Webhook settings
        self.nextjs_url: str = os.getenv("NEXTJS_URL", "http://localhost:3000")
        self.webhook_secret: str = os.getenv("WEBHOOK_SECRET", "dev-secret-change-in-production")

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
            "postgres_host": self.postgres_host,
            "postgres_port": self.postgres_port,
            "postgres_db": self.postgres_db,
            "postgres_user": self.postgres_user,
            "postgres_password": "***" if self.postgres_password else "",
            "langfuse_public_key": "***" if self.langfuse_public_key else "",
            "langfuse_secret_key": "***" if self.langfuse_secret_key else "",
            "langfuse_host": self.langfuse_host,
            "processing_timeout": self.processing_timeout,
            "nextjs_url": self.nextjs_url,
            "webhook_secret": "***" if self.webhook_secret else "",
        }


# Global settings instance
settings = Settings()

# Initialize Langfuse observability
_langfuse_client = initialize_langfuse(settings)

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
    logger.info(f"   - Langfuse observability: {'enabled' if _langfuse_client else 'disabled'}")
except ValueError as e:
    logger.error(f"❌ Configuration error: {e}")
    logger.error("   Please check your environment variables in config.env or .env")
except Exception as e:
    logger.warning(f"⚠️ Configuration warning: {e}")
    logger.warning("   Some settings may use default values")
