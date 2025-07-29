import logging

from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


def initialize_langfuse(settings_instance) -> bool:
    """
    Initialize Langfuse observability for PydanticAI agents.

    This follows the official Langfuse integration pattern using OpenTelemetry
    tracing for PydanticAI agents.
    """
    # Check if Langfuse settings are configured
    public_key = settings_instance.langfuse_public_key
    secret_key = settings_instance.langfuse_secret_key
    host = settings_instance.langfuse_host

    if not public_key or not secret_key:
        logger.info("📊 Langfuse observability disabled (missing credentials)")
        return False

    try:
        # Import required OpenTelemetry components for Langfuse integration
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        # Configure OpenTelemetry with Langfuse
        resource = Resource.create({"service.name": "kosuke-agent"})

        # Set up OTLP exporter for Langfuse
        otlp_exporter = OTLPSpanExporter(
            endpoint=f"{host}/api/public/ingestion/v1/traces",
            headers={
                "Authorization": f"Bearer {public_key}:{secret_key}",
                "Content-Type": "application/json",
            },
        )

        # Configure tracer provider
        tracer_provider = TracerProvider(resource=resource)
        tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        trace.set_tracer_provider(tracer_provider)

        logger.info(f"✅ Langfuse observability enabled - {host}")
        return True

    except ImportError as e:
        logger.warning(f"⚠️ Missing dependencies for Langfuse integration: {e}")
        logger.warning("💡 Install with: pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp")
        return False
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Langfuse: {e}")
        return False


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Basic settings
    log_level: str = "INFO"
    max_iterations: int = 25
    temperature: float = 0.7
    max_tokens: int = 4000

    # Paths
    projects_dir: str = "/app/projects"

    # Model settings
    model_name: str = "claude-3-5-sonnet-20241022"
    anthropic_api_key: str = ""

    # Preview settings
    preview_default_image: str = "ghcr.io/filopedraz/kosuke-template:v0.0.76"
    preview_port_range_start: int = 3001
    preview_port_range_end: int = 3100

    # Database settings
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "kosuke"
    postgres_user: str = "postgres"
    postgres_password: str = "password"

    # Langfuse Observability (Optional)
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    # Processing settings
    processing_timeout: int = 90000

    # Webhook settings
    nextjs_url: str = "http://localhost:3000"
    webhook_secret: str = "dev-secret-change-in-production"

    class Config:
        env_file = "config.env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables not defined in the model

    def validate_settings(self) -> bool:
        """Validate required settings"""
        if not self.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required")

        if self.max_tokens <= 0:
            raise ValueError("MAX_TOKENS must be greater than 0")

        return True


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
