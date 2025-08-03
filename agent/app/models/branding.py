from typing import ClassVar
from typing import Literal

from pydantic import BaseModel
from pydantic import Field


class ColorVariable(BaseModel):
    """Color variable model representing a CSS custom property"""

    name: str = Field(..., description="CSS variable name (e.g., '--primary')")
    lightValue: str = Field(..., description="Color value for light mode (HSL format without hsl())")
    darkValue: str | None = Field(None, description="Color value for dark mode (HSL format without hsl())")
    scope: Literal["root", "dark", "light", "unknown"] = Field(default="root", description="CSS scope for the variable")
    description: str | None = Field(None, description="Human-readable description of the color")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "name": "--primary",
                "lightValue": "220 100% 50%",
                "darkValue": "220 100% 60%",
                "scope": "root",
                "description": "Primary brand color"
            }
        }


class ColorPaletteRequest(BaseModel):
    """Request model for color palette generation"""

    keywords: str = Field(default="", description="Keywords to influence color palette generation")
    existingColors: list[ColorVariable] = Field(default_factory=list, description="Current color variables in the project")
    applyImmediately: bool = Field(default=False, description="Whether to apply colors immediately to globals.css")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "keywords": "modern healthcare professional",
                "existingColors": [
                    {
                        "name": "--primary",
                        "lightValue": "210 100% 50%",
                        "darkValue": "210 100% 60%",
                        "scope": "root"
                    }
                ],
                "applyImmediately": True
            }
        }


class ColorPaletteResponse(BaseModel):
    """Response model for color palette generation"""

    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(default="", description="Human-readable message about the operation")
    colors: list[ColorVariable] = Field(default_factory=list, description="Generated color variables")
    applied: bool = Field(default=False, description="Whether colors were applied to CSS file")
    projectContent: str = Field(default="", description="Summary of analyzed project content")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "success": True,
                "message": "Successfully generated and applied color palette",
                "colors": [
                    {
                        "name": "--primary",
                        "lightValue": "220 100% 50%",
                        "darkValue": "220 100% 60%",
                        "scope": "root",
                        "description": "Primary brand color"
                    }
                ],
                "applied": True,
                "projectContent": "React application with modern healthcare theme"
            }
        }


class ApplyPaletteRequest(BaseModel):
    """Request model for applying a color palette to CSS"""

    colors: list[ColorVariable] = Field(..., description="Color variables to apply")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "colors": [
                    {
                        "name": "--primary",
                        "lightValue": "220 100% 50%",
                        "darkValue": "220 100% 60%",
                        "scope": "root"
                    }
                ]
            }
        }


class ApplyPaletteResponse(BaseModel):
    """Response model for applying color palette"""

    success: bool = Field(..., description="Whether the application was successful")
    message: str = Field(default="", description="Human-readable message about the operation")
    appliedColors: int = Field(default=0, description="Number of colors successfully applied")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "success": True,
                "message": "Successfully applied 8 colors to globals.css",
                "appliedColors": 8
            }
        }