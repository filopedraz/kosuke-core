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

# Configure logging for the entire application
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Output to stdout for Docker logs
    ],
)

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

# Also include root endpoint
app.include_router(health.router, tags=["root"])

if __name__ == "__main__":
    import uvicorn

    # Only bind to all interfaces in development
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
