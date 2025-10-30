import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import branding
from app.api.routes import database

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
app.include_router(database.router, prefix="/api", tags=["database"])


if __name__ == "__main__":
    import uvicorn

    # Only bind to all interfaces in development
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
