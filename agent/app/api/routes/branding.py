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


@router.post("/projects/{project_id}/branding/generate-palette")
async def generate_color_palette(
    project_id: int = Path(..., description="Project ID", ge=1),
    request: ColorPaletteRequest = ...,
    color_palette_service: ColorPaletteService = Depends(get_color_palette_service),
) -> ColorPaletteResponse:
    """
    Generate a color palette for a project using AI analysis

    This endpoint analyzes the project content, existing colors, and user keywords
    to generate a cohesive, accessible color palette for both light and dark modes.
    """
    try:
        logger.info(f"🎨 Color palette generation request for project {project_id}")
        logger.info(f"📋 Keywords: '{request.keywords}'")
        logger.info(f"🎯 Apply immediately: {request.apply_immediately}")
        logger.info(f"📊 Existing colors: {len(request.existing_colors)}")

        # Generate color palette using the service
        result = await color_palette_service.generate_color_palette(
            project_id=project_id,
            keywords=request.keywords,
            existing_colors=request.existing_colors,
            apply_immediately=request.apply_immediately,
        )

        logger.info(f"✅ Color palette generation {'successful' if result.success else 'failed'}")
        return result

    except Exception as error:
        logger.error(f"❌ Error in generate_color_palette endpoint: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to generate color palette: {error!s}") from error


@router.post("/projects/{project_id}/branding/apply-palette")
async def apply_color_palette(
    project_id: int = Path(..., description="Project ID", ge=1),
    request: ApplyPaletteRequest = ...,
    color_palette_service: ColorPaletteService = Depends(get_color_palette_service),
) -> ApplyPaletteResponse:
    """
    Apply a color palette to the project's globals.css file

    This endpoint takes a list of color variables and applies them to the
    project's CSS files, maintaining proper light/dark mode structure.
    """
    try:
        logger.info(f"🎨 Color palette application request for project {project_id}")
        logger.info(f"📊 Colors to apply: {len(request.colors)}")

        # Apply colors using the service
        result = await color_palette_service.apply_color_palette(project_id=project_id, colors=request.colors)

        logger.info(f"✅ Color palette application {'successful' if result.success else 'failed'}")
        return result

    except Exception as error:
        logger.error(f"❌ Error in apply_color_palette endpoint: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to apply color palette: {error!s}") from error


@router.get("/projects/{project_id}/branding/colors")
async def get_existing_colors(
    project_id: int = Path(..., description="Project ID", ge=1),
    color_palette_service: ColorPaletteService = Depends(get_color_palette_service),
) -> dict:
    """
    Get existing color variables from the project's CSS files

    This endpoint analyzes the project's globals.css file and extracts
    all CSS custom properties (color variables) for both light and dark modes.
    """
    try:
        logger.info(f"🔍 Getting existing colors for project {project_id}")

        # Extract existing colors
        existing_colors = await color_palette_service._extract_existing_colors(project_id)

        logger.info(f"📊 Found {len(existing_colors)} existing colors")

        return {
            "success": True,
            "colors": [
                {
                    "name": color.name,
                    "light_value": color.light_value,
                    "dark_value": color.dark_value,
                    "scope": color.scope,
                    "description": color.description,
                }
                for color in existing_colors
            ],
            "count": len(existing_colors),
        }

    except Exception as error:
        logger.error(f"❌ Error in get_existing_colors endpoint: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to get existing colors: {error!s}") from error
