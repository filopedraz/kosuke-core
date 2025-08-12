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


@router.get("/projects/{project_id}/sessions/{session_id}/branding/colors")
async def get_session_existing_colors(
    project_id: int = Path(..., description="Project ID", ge=1),
    session_id: str = Path(..., description="Session ID"),
    color_palette_service: ColorPaletteService = ColorPaletteServiceDep,
) -> dict:
    """
    Get existing color variables from the session's CSS files

    This endpoint analyzes the session's globals.css file and extracts
    all CSS custom properties (color variables) for both light and dark modes.
    """
    try:
        logger.info(f"🔍 Getting existing colors for project {project_id}, session {session_id}")

        # Extract existing colors from session
        existing_colors = await color_palette_service._extract_existing_colors(project_id, session_id)

        logger.info(f"📊 Found {len(existing_colors)} existing colors in session {session_id}")

        # Helper function to format color values for CSS
        def format_color_value(value: str) -> str:
            if not value:
                return ""

            # If already in CSS format, return as-is
            if value.startswith(("hsl(", "rgb(", "oklch(", "#")):
                return value

            # If it contains alpha (has slash), handle separately
            if " / " in value:
                parts = value.split(" / ")
                if len(parts) == 2:
                    base_values = parts[0].strip()
                    alpha = parts[1].strip()
                    return f"oklch({base_values} / {alpha})"

            # Standard OKLCH format: "L C H" -> "oklch(L C H)"
            return f"oklch({value})"

        return {
            "success": True,
            "colors": [
                {
                    "name": color.name,
                    "lightValue": format_color_value(color.light_value),
                    "darkValue": format_color_value(color.dark_value) if color.dark_value else None,
                    "scope": color.scope,
                    "description": color.description,
                }
                for color in existing_colors
            ],
            "count": len(existing_colors),
            "session_id": session_id,
        }

    except Exception as error:
        logger.error(f"❌ Error in get_session_existing_colors endpoint: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to get session existing colors: {error!s}") from error


@router.post("/projects/{project_id}/sessions/{session_id}/branding/colors")
async def update_session_color(
    request: dict,
    project_id: int = Path(..., description="Project ID", ge=1),
    session_id: str = Path(..., description="Session ID"),
    color_palette_service: ColorPaletteService = ColorPaletteServiceDep,
) -> dict:
    """
    Update a single color variable in the session's CSS files
    """
    try:
        logger.info(f"🎨 Session color update request for project {project_id}, session {session_id}")

        # Validate request
        if not request.get("name") or not request.get("value"):
            raise HTTPException(status_code=400, detail="Missing required fields: name and value")

        # Update single color using the service with session context
        result = await color_palette_service.update_single_color(
            project_id=project_id,
            session_id=session_id,
            name=request["name"],
            value=request["value"],
            mode=request.get("mode", "light"),
        )

        logger.info(f"✅ Session color update {'successful' if result.get('success') else 'failed'}")
        return result

    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"❌ Error in update_session_color endpoint: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to update session color: {error!s}") from error


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
