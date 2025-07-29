import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Keys
    anthropic_api_key: str

    # Logging
    log_level: str = "INFO"

    # Agent Configuration
    max_iterations: int = 25
    processing_timeout: int = 90000  # milliseconds
    max_tokens: int = 60000

    # File System
    projects_dir: str = "/app/projects"

    # Model Configuration
    model_name: str = "claude-3-5-sonnet-20241022"
    temperature: float = 0.7

    # Webhook Configuration
    nextjs_url: str = "http://localhost:3000"
    webhook_secret: str = "dev-secret-change-in-production"

    # Preview Configuration
    preview_default_image: str = os.getenv("PREVIEW_DEFAULT_IMAGE", "ghcr.io/filopedraz/kosuke-template:v0.0.76")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def validate_settings(self) -> bool:
        """Validate that required settings are present"""
        if not self.anthropic_api_key or self.anthropic_api_key == "your_api_key_here":
            raise ValueError("ANTHROPIC_API_KEY must be set to a valid API key")

        if self.max_iterations <= 0:
            raise ValueError("MAX_ITERATIONS must be greater than 0")

        if self.max_tokens <= 0:
            raise ValueError("MAX_TOKENS must be greater than 0")

        return True


# Global settings instance
settings = Settings()

# Validate settings on import
try:
    settings.validate_settings()
    print("✅ Configuration loaded successfully")
    print(f"   - Log level: {settings.log_level}")
    print(f"   - Max iterations: {settings.max_iterations}")
    print(f"   - Projects directory: {settings.projects_dir}")
    print(f"   - Model: {settings.model_name}")
    print(f"   - Preview image: {settings.preview_default_image}")
except ValueError as e:
    print(f"❌ Configuration error: {e}")
    print("   Please check your environment variables in config.env or .env")
except Exception as e:
    print(f"⚠️ Configuration warning: {e}")
    print("   Some settings may use default values")
