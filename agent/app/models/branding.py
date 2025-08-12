from typing import ClassVar
from typing import Literal

from pydantic import BaseModel
from pydantic import Field


class ColorVariable(BaseModel):
    """Color variable model representing a CSS custom property"""

    name: str = Field(..., description="CSS variable name (e.g., '--primary')")
    light_value: str = Field(..., description="Color value for light mode (HSL format without hsl())")
    dark_value: str | None = Field(None, description="Color value for dark mode (HSL format without hsl())")
    scope: Literal["root", "dark", "light", "unknown"] = Field(default="root", description="CSS scope for the variable")
    description: str | None = Field(None, description="Human-readable description of the color")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "name": "--primary",
                "light_value": "220 100% 50%",
                "dark_value": "220 100% 60%",
                "scope": "root",
                "description": "Primary brand color",
            }
        }


class ColorPaletteRequest(BaseModel):
    """Request model for color palette generation"""

    keywords: str = Field(default="", description="Keywords to influence color palette generation")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "keywords": "modern healthcare professional",
            }
        }


class ColorPaletteResponse(BaseModel):
    """Response model for color palette generation"""

    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(default="", description="Human-readable message about the operation")
    colors: list[ColorVariable] = Field(default_factory=list, description="Generated color variables")
    project_content: str = Field(default="", description="Summary of analyzed project content")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "success": True,
                "message": "Successfully generated color palette",
                "colors": [
                    {
                        "name": "--primary",
                        "light_value": "220 100% 50%",
                        "dark_value": "220 100% 60%",
                        "scope": "root",
                        "description": "Primary brand color",
                    }
                ],
                "project_content": "React application with modern healthcare theme",
            }
        }


class ApplyPaletteRequest(BaseModel):
    """Request model for applying a color palette to CSS"""

    colors: list[ColorVariable] = Field(..., description="Color variables to apply")

    class Config:
        schema_extra: ClassVar = {
            "example": {
                "colors": [
                    {"name": "--primary", "light_value": "220 100% 50%", "dark_value": "220 100% 60%", "scope": "root"}
                ]
            }
        }


class ApplyPaletteResponse(BaseModel):
    """Response model for applying color palette"""

    success: bool = Field(..., description="Whether the application was successful")
    message: str = Field(default="", description="Human-readable message about the operation")
    applied_colors: int = Field(default=0, description="Number of colors successfully applied")

    class Config:
        schema_extra: ClassVar = {
            "example": {"success": True, "message": "Successfully applied 8 colors to globals.css", "applied_colors": 8}
        }
