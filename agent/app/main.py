import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import branding
from app.api.routes import database
from app.api.routes import github
from app.api.routes import health
from app.api.routes import preview
from app.api.routes import revert
from app.services.docker_service import DockerService

# Configure logging for the entire application
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Output to stdout for Docker logs
    ],
)


async def startup_tasks():
    """Startup tasks to run when the application starts"""
    logger = logging.getLogger(__name__)
    try:
        # Initialize DockerService to ensure preview image is pre-pulled
        _docker_service = DockerService()
        logger.info("✅ DockerService initialized and preview image pre-pull started")
    except Exception as e:
        logger.error(f"❌ Failed to initialize DockerService during startup: {e}")
        # Don't fail startup if Docker service init fails - let individual requests handle it


app = FastAPI(title="Agentic Coding Pipeline", description="AI-powered code generation microservice", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(branding.router, prefix="/api", tags=["branding"])
app.include_router(database.router, prefix="/api", tags=["database"])
app.include_router(github.router, prefix="/api", tags=["github"])
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(preview.router, prefix="/api", tags=["preview"])
app.include_router(revert.router, prefix="/api", tags=["revert"])

# Also include root endpoint
app.include_router(health.router, tags=["root"])


# Startup event
@app.on_event("startup")
async def startup_event():
    """Run startup tasks when the application starts"""
    await startup_tasks()


if __name__ == "__main__":
    import uvicorn

    # Only bind to all interfaces in development
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
