import json
import logging
import re
from pathlib import Path

from anthropic import AsyncAnthropic

from app.models.branding import ApplyPaletteResponse
from app.models.branding import ColorPaletteResponse
from app.models.branding import ColorVariable
from app.services.fs_service import FileSystemService
from app.utils.config import settings

logger = logging.getLogger(__name__)


class ColorPaletteService:
    """
    Service for generating AI-powered color palettes using Claude
    """

    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate_color_palette(
        self,
        project_id: int,
        keywords: str = "",
        existing_colors: list[ColorVariable] | None = None,
        apply_immediately: bool = False,
    ) -> ColorPaletteResponse:
        """
        Generate a color palette for a project using Claude
        """
        try:
            logger.info(f"🎨 Generating color palette for project {project_id}")

            # Extract existing colors if not provided
            if existing_colors is None:
                existing_colors = await self._extract_existing_colors(project_id)

            logger.info(f"📊 Found {len(existing_colors)} existing colors")

            # Generate colors using Claude
            generated_colors = await self._generate_colors_with_claude(project_id, keywords, existing_colors)

            # Validate all generated color values strictly before returning
            for color in generated_colors:
                self._validate_oklch(color.light_value, color.name, scope="light")
                if color.dark_value:
                    self._validate_oklch(color.dark_value, color.name, scope="dark")

            # Apply colors if requested
            applied = False
            if apply_immediately:
                apply_result = await self.apply_color_palette(project_id, generated_colors)
                applied = apply_result.success

            return ColorPaletteResponse(
                success=True,
                message=f"Successfully generated {len(generated_colors)} colors",
                colors=generated_colors,
                applied=applied,
                project_content="",
            )

        except Exception as error:
            logger.error(f"❌ Error generating color palette: {error}")
            return ColorPaletteResponse(
                success=False, message=f"Failed to generate color palette: {error!s}", colors=[], applied=False
            )

    async def apply_color_palette(self, project_id: int, colors: list[ColorVariable]) -> ApplyPaletteResponse:
        """
        Apply a color palette to the project's globals.css file
        """
        try:
            logger.info(f"🎨 Applying {len(colors)} colors to project {project_id}")

            # Find and update globals.css
            globals_path = await self._find_globals_css(project_id)
            if not globals_path:
                return ApplyPaletteResponse(
                    success=False, message="Could not find globals.css file in project", applied_colors=0
                )

            # Read current CSS content
            css_content = await FileSystemService().read_file(str(globals_path))

            # Validate all provided colors strictly before applying
            for color in colors:
                self._validate_oklch(color.light_value, color.name, scope="light")
                if color.dark_value:
                    self._validate_oklch(color.dark_value, color.name, scope="dark")

            # Apply color variables to CSS
            updated_css = await self._apply_colors_to_css(css_content, colors)

            # Write updated CSS back to file atomically
            await FileSystemService().update_file(str(globals_path), updated_css)

            logger.info(f"✅ Successfully applied {len(colors)} colors to globals.css")

            return ApplyPaletteResponse(
                success=True,
                message=f"Successfully applied {len(colors)} colors to globals.css",
                applied_colors=len(colors),
            )

        except Exception as error:
            logger.error(f"❌ Error applying color palette: {error}")
            return ApplyPaletteResponse(
                success=False, message=f"Failed to apply color palette: {error!s}", applied_colors=0
            )

    async def _extract_existing_colors(self, project_id: int) -> list[ColorVariable]:
        """
        Extract existing CSS color variables from globals.css
        """
        try:
            globals_path = await self._find_globals_css(project_id)
            if not globals_path:
                return []

            css_content = await FileSystemService().read_file(str(globals_path))

            colors = []

            # Extract variables from :root block
            root_match = re.search(r":root\s*{([^}]*)}", css_content, re.DOTALL)
            if root_match:
                root_vars = root_match.group(1)
                colors.extend(self._parse_css_variables(root_vars, "root"))

            # Extract variables from .dark block
            dark_match = re.search(r"\.dark\s*{([^}]*)}", css_content, re.DOTALL)
            if dark_match:
                dark_vars = dark_match.group(1)
                dark_colors = self._parse_css_variables(dark_vars, "dark")

                # Merge with existing root colors
                for dark_color in dark_colors:
                    existing_color = next((c for c in colors if c.name == dark_color.name), None)
                    if existing_color:
                        existing_color.dark_value = dark_color.light_value
                    else:
                        colors.append(
                            ColorVariable(
                                name=dark_color.name, light_value="", dark_value=dark_color.light_value, scope="dark"
                            )
                        )

            return colors

        except Exception as error:
            logger.warning(f"⚠️ Error extracting existing colors: {error}")
            return []

    def _parse_css_variables(self, css_block: str, scope: str) -> list[ColorVariable]:
        """
        Parse CSS variables from a CSS block
        """
        variables = []

        # Match CSS custom properties
        pattern = r"--([^:]+):\s*([^;]+);"
        matches = re.findall(pattern, css_block)

        # Variables that are not colors (should be skipped)
        non_color_vars = {
            "radius",
            "font-sans",
            "font-mono",
            "shadow",
            "animation",
            "font-family",
            "font-size",
            "line-height",
            "spacing",
            "z-index",
        }

        for name_part, value_part in matches:
            # Clean up the values
            name = f"--{name_part.strip()}"
            value = value_part.strip()

            # Skip non-color variables
            if name_part.strip() in non_color_vars:
                continue

            # Only process actual color values (oklch, hsl, or color names)
            if not (
                "oklch(" in value
                or "hsl(" in value
                or "rgb(" in value
                or any(
                    color_word in value.lower()
                    for color_word in [
                        "black",
                        "white",
                        "red",
                        "blue",
                        "green",
                        "yellow",
                        "purple",
                        "orange",
                        "gray",
                        "grey",
                    ]
                )
            ):
                continue

            # Remove oklch() or hsl() wrapper if present and keep only the values
            oklch_match = re.search(r"oklch\(([^)]+)\)", value)
            hsl_match = re.search(r"hsl\(([^)]+)\)", value)
            if oklch_match:
                value = oklch_match.group(1)
            elif hsl_match:
                value = hsl_match.group(1)

            variables.append(ColorVariable(name=name, light_value=value, scope=scope))

        return variables

    async def _generate_colors_with_claude(
        self, project_id: int, keywords: str, existing_colors: list[ColorVariable]
    ) -> list[ColorVariable]:
        """
        Use Claude to generate a color palette
        """
        # Prepare the prompt
        existing_colors_json = [
            {"name": color.name, "light_value": color.light_value, "dark_value": color.dark_value, "scope": color.scope}
            for color in existing_colors
        ]

        system_prompt = (
            "You are an expert UI/UX designer and color specialist. "
            "Your task is to generate a cohesive, modern, and accessible "
            "color palette for both light and dark modes.\n\n"
            "Follow these requirements:\n"
            "1. CRITICAL: Return ALL existing color variables with their exact names - "
            "do not miss any!\n"
            "2. IGNORE ALL EXISTING COLOR VALUES - only keep the variable names and "
            "generate entirely new color values\n"
            "3. Ensure proper contrast ratios for accessibility (WCAG AA compliance)\n"
            "4. Create a balanced palette with primary, secondary, and accent colors\n"
            "5. Maintain semantic meaning of color variables (e.g., destructive should be red-based)\n"
            "6. Format ALL output as a valid JSON array of color objects\n"
            "7. All colors should be in OKLCH format as string like '0.65 0.15 180' "
            "(lightness chroma hue, NOT oklch(0.65 0.15 180))\n"
            "8. Return only the JSON array, no explanations or additional text\n"
            "9. IMPORTANT: Your response MUST include ALL existing color variables without exception\n"
            "10. Use OKLCH values: lightness (0-1), chroma (0-0.4 typical), hue (0-360 degrees)\n\n"
            "Example output format:\n"
            "[\n"
            "  {\n"
            "    'name': '--background',\n"
            "    'light_value': '1 0 0',\n"
            "    'dark_value': '0.145 0 0',\n"
            "    'scope': 'root'\n"
            "  },\n"
            "  {\n"
            "    'name': '--foreground',\n"
            "    'light_value': '0.145 0 0',\n"
            "    'dark_value': '0.985 0 0',\n"
            "    'scope': 'root'\n"
            "  },\n"
            "  {\n"
            "    'name': '--primary',\n"
            "    'light_value': '0.488 0.243 264.376',\n"
            "    'dark_value': '0.646 0.222 41.116',\n"
            "    'scope': 'root'\n"
            "  }\n"
            "]"
        )

        keyword_text = f"Keywords to influence the palette: {keywords}" if keywords else ""
        user_prompt = (
            "Generate a color palette for my website. Here are my existing color variables "
            "which MUST ALL be included in your response:\n"
            f"{json.dumps(existing_colors_json, indent=2)}\n\n"
            f"Project ID: {project_id}\n"
            f"{keyword_text}\n\n"
            "Create a cohesive, modern color palette"
            f'{" with influence from the provided keywords" if keywords else ""}. '
            "You MUST include ALL existing color variables in your response - "
            "do not miss any variables that were in the input list."
        )

        try:
            logger.info("🤖 Calling Claude for color generation...")

            # One-shot call with short timeout and single retry on transient errors
            async def _call_once():
                return await self.client.messages.create(
                    model="claude-3-7-sonnet-20250219",
                    max_tokens=4000,
                    temperature=0.7,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                )

            try:
                response = await _call_once()
            except Exception as first_error:
                import asyncio
                import random

                await asyncio.sleep(0.2 + random.random() * 0.3)
                response = await _call_once()

            response_text = response.content[0].text
            logger.info(f"📝 Claude response length: {len(response_text)} characters")

            # Extract JSON from response
            json_match = re.search(r"\[\s*\{[\s\S]*\}\s*\]", response_text)
            if not json_match:
                raise ValueError("No valid JSON array found in Claude response")

            json_str = json_match.group(0)
            colors_data = json.loads(json_str)

            # Convert to ColorVariable objects
            colors = []
            for color_data in colors_data:
                colors.append(
                    ColorVariable(
                        name=color_data["name"],
                        light_value=color_data.get("light_value") or color_data.get("lightValue"),
                        dark_value=color_data.get("dark_value") or color_data.get("darkValue"),
                        scope=color_data.get("scope", "root"),
                        description=color_data.get("description"),
                    )
                )

            logger.info(f"✅ Successfully generated {len(colors)} colors")
            return colors

        except Exception as error:
            logger.error(f"❌ Error calling Claude: {error}")
            raise error

    def _validate_oklch(self, value: str | None, var_name: str, scope: str = "light") -> None:
        """Validate OKLCH value string 'L C H'; raise ValueError on invalid."""
        if not value or not isinstance(value, str):
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: missing value")
        # Expect three floats separated by spaces
        parts = value.strip().split()
        if len(parts) != 3:
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: expected 'L C H' (3 parts)")
        try:
            L, C, H = float(parts[0]), float(parts[1]), float(parts[2])
        except Exception:
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: non-numeric components")
        if not (0.0 <= L <= 1.0):
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: L out of range [0,1]")
        if not (0.0 <= C <= 0.5):
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: C out of range [0,0.5]")
        if not (0.0 <= H <= 360.0):
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: H out of range [0,360]")

    async def _find_globals_css(self, project_id: int) -> Path | None:
        """
        Find the globals.css file in the project
        """
        project_path = FileSystemService().get_project_path(project_id)

        # Common locations for globals.css
        possible_paths = [
            project_path / "app" / "globals.css",
            project_path / "src" / "globals.css",
            project_path / "styles" / "globals.css",
            project_path / "app" / "global.css",
        ]

        for path in possible_paths:
            if path.exists():
                return path

        return None

    async def _apply_colors_to_css(self, css_content: str, colors: list[ColorVariable]) -> str:
        """
        Apply color variables to CSS content
        """
        # Separate colors by scope
        root_colors = []
        dark_colors = []

        for color in colors:
            if color.scope in ["root", "light"]:
                root_colors.append(f"  {color.name}: oklch({color.light_value});")

            if color.dark_value and color.scope in ["root", "dark"]:
                dark_colors.append(f"  {color.name}: oklch({color.dark_value});")

        # Create CSS blocks
        root_block = f":root {{\n{chr(10).join(root_colors)}\n}}"
        dark_block = f".dark {{\n{chr(10).join(dark_colors)}\n}}" if dark_colors else ""

        # Replace or add blocks
        css_content = self._replace_or_add_css_block(css_content, root_block, r":root\s*{[^}]*}")

        if dark_block:
            css_content = self._replace_or_add_css_block(css_content, dark_block, r"\.dark\s*{[^}]*}")

        return css_content

    def _replace_or_add_css_block(self, css_content: str, new_block: str, pattern: str) -> str:
        """
        Replace existing CSS block or add new one
        """
        if re.search(pattern, css_content):
            # Replace existing block
            return re.sub(pattern, new_block, css_content)
        # Add new block - find good insertion point
        import_end = -1
        for match in re.finditer(r"@import[^;]*;", css_content):
            import_end = match.end()

        if import_end > -1:
            # Insert after imports
            return css_content[:import_end] + f"\n\n{new_block}\n" + css_content[import_end:]
        # Insert at beginning
        return f"{new_block}\n\n{css_content}"
