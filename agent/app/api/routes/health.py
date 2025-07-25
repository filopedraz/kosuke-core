import platform
from datetime import datetime

import psutil
from fastapi import APIRouter

from app.utils.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint

    Returns service status, configuration, and system metrics
    """
    try:
        # Get system information
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        return {
            "status": "healthy",
            "service": "Agentic Coding Pipeline",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "configuration": {
                "max_iterations": settings.max_iterations,
                "max_tokens": settings.max_tokens,
                "model_name": settings.model_name,
                "projects_dir": settings.projects_dir,
                "log_level": settings.log_level,
            },
            "system": {
                "platform": platform.system(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "memory_percent": memory.percent,
                "disk_total_gb": round(disk.total / (1024**3), 2),
                "disk_free_gb": round(disk.free / (1024**3), 2),
                "disk_percent": round((disk.used / disk.total) * 100, 1),
            },
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "Agentic Coding Pipeline",
            "version": "1.0.0",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }


@router.get("/health/simple")
async def simple_health_check():
    """Simple health check for basic monitoring"""
    return {"status": "healthy", "service": "Agentic Coding Pipeline", "version": "1.0.0"}


@router.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "message": "Agentic Coding Pipeline API",
        "service": "Agentic Coding Pipeline",
        "version": "1.0.0",
        "description": "AI-powered code generation microservice built with FastAPI, PydanticAI, and Claude 3.5 Sonnet",
        "endpoints": {
            "health": "/api/health",
            "chat_streaming": "/api/chat/stream",
            "chat_simple": "/api/chat",
            "test": "/api/test",
        },
        "documentation": {"swagger": "/docs", "redoc": "/redoc"},
    }
