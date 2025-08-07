import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import branding
from app.api.routes import chat
from app.api.routes import database
from app.api.routes import github
from app.api.routes import health
from app.api.routes import preview
from app.api.routes import revert
from app.api.routes.project_files import router as project_files_router

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

    # Ensure projects directory exists
    try:
        from app.services.fs_service import fs_service

        await fs_service.ensure_projects_dir()
        logger.info(f"✅ Projects directory ensured: {fs_service.projects_dir}")
    except Exception as e:
        logger.error(f"❌ Failed to ensure projects directory: {e}")

    try:
        # Initialize DockerService to ensure preview image is available
        from app.services.docker_service import DockerService

        _docker_service = DockerService()
        logger.info("✅ DockerService initialized and preview image check started")
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
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(database.router, prefix="/api", tags=["database"])
app.include_router(github.router, prefix="/api", tags=["github"])
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(preview.router, prefix="/api", tags=["preview"])
app.include_router(revert.router, prefix="/api", tags=["revert"])
app.include_router(
    project_files_router,
    prefix="/api/v1",
    tags=["Project Files"],
)

# Also include root endpoint
app.include_router(health.router, tags=["root"])


# Startup event
@app.on_event("startup")
async def startup_event():
    """Run startup tasks when the application starts"""
    await startup_tasks()

    # Initialize file storage on startup
    from app.services.file_storage_service import file_storage
    logger = logging.getLogger(__name__)
    await file_storage.initialize()
    logger.info("File storage service initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up services on shutdown"""
    from app.services.file_storage_service import file_storage
    logger = logging.getLogger(__name__)
    await file_storage.close()
    logger.info("File storage service closed")


if __name__ == "__main__":
    import uvicorn

    # Only bind to all interfaces in development
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
