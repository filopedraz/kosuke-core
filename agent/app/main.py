from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat
from app.api.routes import health
from app.api.routes import preview
from app.api.routes import agentic

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
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(agentic.router, prefix="/api", tags=["agentic"])
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(preview.router, prefix="/api", tags=["preview"])

# Also include root endpoint
app.include_router(health.router, tags=["root"])

if __name__ == "__main__":
    import uvicorn

    # Only bind to all interfaces in development
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
