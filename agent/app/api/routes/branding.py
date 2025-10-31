import logging

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Path

from app.models.branding import ApplyPaletteRequest
from app.models.branding import ApplyPaletteResponse
from app.models.branding import ColorPaletteRequest
from app.models.branding import ColorPaletteResponse
from app.services.color_palette_service import ColorPaletteService
from app.utils.providers import get_color_palette_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Module-level dependency to avoid B008 linting error
ColorPaletteServiceDep = Depends(get_color_palette_service)


@router.post("/projects/{project_id}/sessions/{session_id}/branding/generate-palette")
async def generate_session_color_palette(
    request: ColorPaletteRequest,
    project_id: int = Path(..., description="Project ID", ge=1),
    session_id: str = Path(..., description="Session ID"),
    color_palette_service: ColorPaletteService = ColorPaletteServiceDep,
) -> ColorPaletteResponse:
    """
    Generate a color palette for a session-specific project using AI analysis

    This endpoint analyzes the session's project content and user keywords
    to generate a cohesive, accessible color palette for both light and dark modes.
    """
    try:
        logger.info(f"🎨 Session color palette generation request for project {project_id}, session {session_id}")
        logger.info(f"📋 Keywords: '{request.keywords}'")

        # Generate color palette using the service with session context
        result = await color_palette_service.generate_color_palette(
            project_id=project_id,
            session_id=session_id,
            keywords=request.keywords,
        )

        logger.info(f"✅ Session color palette generation {'successful' if result.success else 'failed'}")
        return result

    except Exception as error:
        logger.error(f"❌ Error in generate_session_color_palette endpoint: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to generate session color palette: {error!s}") from error


@router.post("/projects/{project_id}/sessions/{session_id}/branding/apply-palette")
async def apply_session_color_palette(
    request: ApplyPaletteRequest,
    project_id: int = Path(..., description="Project ID", ge=1),
    session_id: str = Path(..., description="Session ID"),
    color_palette_service: ColorPaletteService = ColorPaletteServiceDep,
) -> ApplyPaletteResponse:
    """
    Apply a color palette to the session's globals.css file

    This endpoint takes a list of color variables and applies them to the
    session's CSS files, maintaining proper light/dark mode structure.
    """
    try:
        logger.info(f"🎨 Session color palette application request for project {project_id}, session {session_id}")
        logger.info(f"📊 Colors to apply: {len(request.colors)}")

        # Apply colors using the service with session context
        result = await color_palette_service.apply_color_palette(
            project_id=project_id, session_id=session_id, colors=request.colors
        )

        logger.info(f"✅ Session color palette application {'successful' if result.success else 'failed'}")
        return result

    except Exception as error:
        logger.error(f"❌ Error in apply_session_color_palette endpoint: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to apply session color palette: {error!s}") from error


@router.get("/projects/{project_id}/sessions/{session_id}/branding/fonts")
async def get_session_fonts(
    project_id: int = Path(..., description="Project ID", ge=1),
    session_id: str = Path(..., description="Session ID"),
    color_palette_service: ColorPaletteService = ColorPaletteServiceDep,
) -> dict:
    """
    Get font information from the session's layout files
    """
    try:
        logger.info(f"🔍 Getting fonts for project {project_id}, session {session_id}")

        # Get fonts from session
        fonts = await color_palette_service.get_session_fonts(project_id, session_id)

        logger.info(f"📊 Found {len(fonts)} fonts in session {session_id}")

        return {
            "success": True,
            "fonts": fonts,
            "count": len(fonts),
            "session_id": session_id,
        }

    except Exception as error:
        logger.error(f"❌ Error in get_session_fonts endpoint: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to get session fonts: {error!s}") from error
