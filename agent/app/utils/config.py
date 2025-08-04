import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def initialize_langfuse(settings_instance) -> bool:
    """
    Initialize Langfuse observability for native Anthropic SDK.

    Uses OpenTelemetry instrumentation for Anthropic API calls.
    """
    # Check if Langfuse settings are configured
    public_key = settings_instance.langfuse_public_key
    secret_key = settings_instance.langfuse_secret_key
    host = settings_instance.langfuse_host

    if not public_key or not secret_key:
        logger.info("📊 Langfuse observability disabled (missing credentials)")
        return False

    try:
        # Set environment variables for Langfuse SDK
        os.environ["LANGFUSE_PUBLIC_KEY"] = public_key
        os.environ["LANGFUSE_SECRET_KEY"] = secret_key
        os.environ["LANGFUSE_HOST"] = host

        # Import required dependencies
        from langfuse import get_client
        from opentelemetry.instrumentation.anthropic import AnthropicInstrumentor

        # Initialize Langfuse client
        langfuse = get_client()

        # Verify connection
        if langfuse.auth_check():
            logger.info(f"✅ Langfuse client authenticated - {host}")

            # Initialize OpenTelemetry instrumentation for Anthropic
            AnthropicInstrumentor().instrument()
            logger.info("🔧 Anthropic OpenTelemetry instrumentation enabled")

            return True

        logger.warning("❌ Langfuse authentication failed. Please check your credentials and host.")
        return False

    except ImportError as e:
        logger.warning(f"⚠️ Missing dependencies for Langfuse integration: {e}")
        logger.warning("💡 Install with: pip install langfuse opentelemetry-instrumentation-anthropic")
        return False
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Langfuse: {e}")
        return False


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
            "PREVIEW_DEFAULT_IMAGE", "ghcr.io/filopedraz/kosuke-template:v0.0.76"
        )
        self.preview_port_range_start: int = int(os.getenv("PREVIEW_PORT_RANGE_START", "3001"))
        self.preview_port_range_end: int = int(os.getenv("PREVIEW_PORT_RANGE_END", "3100"))

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
langfuse_enabled = initialize_langfuse(settings)

# Validate settings on import
try:
    settings.validate_settings()
    print("✅ Configuration loaded successfully")
    print(f"   - Log level: {settings.log_level}")
    print(f"   - Max iterations: {settings.max_iterations}")
    print(f"   - Projects directory: {settings.projects_dir}")
    print(f"   - Model: {settings.model_name}")
    print(f"   - Preview image: {settings.preview_default_image}")
    print(f"   - Langfuse observability: {'enabled' if langfuse_enabled else 'disabled'}")
except ValueError as e:
    print(f"❌ Configuration error: {e}")
    print("   Please check your environment variables in config.env or .env")
except Exception as e:
    print(f"⚠️ Configuration warning: {e}")
    print("   Some settings may use default values")
