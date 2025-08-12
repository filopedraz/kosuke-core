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


SYSTEM_PROMPT = """
You are an expert UI/UX designer and color specialist.
Your task is to generate a cohesive, modern, and accessible color palette for
both light and dark modes for a web application.

You will receive a short list of user-provided keywords in the user message.
Generate the palette to be consistent with, inspired by, and reflective of
those keywords (tone, mood, industry, style), while still adhering to the
accessibility and structural requirements below.

### CRITICAL INSTRUCTIONS:
1. Return ALL existing color variables with their exact names — do not miss any.
2. IGNORE ALL EXISTING COLOR VALUES — only keep variable names and generate entirely new values.
3. Ensure proper contrast ratios for accessibility (WCAG AA compliance).
4. Create a balanced palette with primary, secondary, accent, and semantic colors.
5. Maintain semantic meaning (e.g., destructive should be red-based).
6. Output MUST be a valid JSON array of color objects, and nothing else.

### OKLCH FORMAT REQUIREMENTS (CRITICAL):
7. Use OKLCH values as EXACTLY 3 space-separated numbers: 'L C H'
8. L (Lightness): 0.0 to 1.0 (e.g., '0.5')
9. C (Chroma): 0.0 to 0.4 (e.g., '0.2')
10. H (Hue): 0.0 to 360.0 (e.g., '200')
11. Example valid format: "0.5 0.2 200" (NOT "0.5 0.2 200 / 50%" or "oklch(0.5 0.2 200)")
12. NO alpha values, NO percentage signs, NO extra syntax
13. Include both light_value and dark_value when appropriate; scope is usually 'root'.

### INVALID EXAMPLES TO AVOID:
- "1 0 0 / 15%" ❌
- "oklch(0.5 0.2 200)" ❌
- "0.5, 0.2, 200" ❌

### VALID EXAMPLES:
- "0.5 0.2 200" ✅
- "0.8 0.1 120" ✅
- "0.2 0.05 240" ✅
"""


class ColorPaletteService:
    """
    Service for generating AI-powered color palettes using Claude
    """

    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate_color_palette(
        self,
        project_id: int,
        session_id: str,
        keywords: str = "",
    ) -> ColorPaletteResponse:
        """
        Generate a color palette for a session using Claude
        """
        try:
            logger.info(f"🎨 Generating color palette for project {project_id}, session {session_id}")

            # Always extract existing colors to provide format context to the model
            existing_colors = await self._extract_existing_colors(project_id, session_id=session_id)

            logger.info(f"📊 Found {len(existing_colors)} existing colors")

            # Generate colors using Claude
            generated_colors = await self._generate_colors_with_claude(project_id, keywords, existing_colors)

            print(generated_colors)

            # Validate all generated color values strictly before returning
            logger.info(f"🔍 Validating {len(generated_colors)} generated colors...")
            for color in generated_colors:
                try:
                    self._validate_oklch(color.light_value, color.name, scope="light")
                    if color.dark_value:
                        self._validate_oklch(color.dark_value, color.name, scope="dark")
                except ValueError as e:
                    logger.error(f"❌ Validation failed for {color.name}: {e}")
                    raise

            return ColorPaletteResponse(
                success=True,
                message=f"Successfully generated {len(generated_colors)} colors",
                colors=generated_colors,
                project_content="",
            )

        except Exception as error:
            logger.error(f"❌ Error generating color palette: {error}")
            return ColorPaletteResponse(
                success=False, message=f"Failed to generate color palette: {error!s}", colors=[]
            )

    async def apply_color_palette(
        self, project_id: int, session_id: str, colors: list[ColorVariable]
    ) -> ApplyPaletteResponse:
        """
        Apply a color palette to the session's globals.css file
        """
        try:
            logger.info(f"🎨 Applying {len(colors)} colors to project {project_id}, session {session_id}")

            # Find and update globals.css
            globals_path = await self._find_globals_css(project_id, session_id=session_id)
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

    async def _extract_existing_colors(self, project_id: int, session_id: str) -> list[ColorVariable]:
        """
        Extract existing CSS color variables from session's globals.css
        """
        try:
            globals_path = await self._find_globals_css(project_id, session_id=session_id)
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

        # Build system content using the global SYSTEM_PROMPT and include dynamic context
        system_content = (
            SYSTEM_PROMPT
            + "\n\nExisting color variables (names only, include ALL in output):\n"
            + json.dumps(existing_colors_json, indent=2)
            + f"\n\nProject ID: {project_id}"
            + "\n\nRemember: Each color MUST have light_value and dark_value as exactly 3 space-separated numbers "
            + "like '0.5 0.2 200'"
        )

        # Per spec, the user prompt should include only the optional keywords
        user_prompt = keywords or ""

        try:
            logger.info("🤖 Calling Claude for color generation...")

            # One-shot call with short timeout and single retry on transient errors
            async def _call_once():
                return await self.client.messages.create(
                    model=settings.model_name,
                    max_tokens=4000,
                    temperature=0.7,
                    system=system_content,
                    messages=[{"role": "user", "content": user_prompt}],
                )

            try:
                response = await _call_once()
            except Exception:
                import asyncio

                await asyncio.sleep(0.3)
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

        cleaned_value = value.strip()
        self._check_invalid_patterns(cleaned_value, var_name, scope)
        lightness, chroma, hue = self._parse_oklch_components(cleaned_value, var_name, scope)
        self._validate_oklch_ranges(lightness, chroma, hue, var_name, scope)

    def _check_invalid_patterns(self, value: str, var_name: str, scope: str) -> None:
        """Check for common invalid OKLCH patterns."""
        if "/" in value:
            raise ValueError(
                f"Invalid {scope} OKLCH for {var_name}: contains alpha syntax '/' - use only 'L C H' format"
            )
        if "oklch(" in value.lower():
            raise ValueError(
                f"Invalid {scope} OKLCH for {var_name}: contains oklch() wrapper - use only 'L C H' values"
            )
        if "," in value:
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: contains commas - use spaces to separate L C H")
        if "%" in value:
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: contains percentage - use decimal values only")

    def _parse_oklch_components(self, value: str, var_name: str, scope: str) -> tuple[float, float, float]:
        """Parse OKLCH components from cleaned value string."""
        parts = value.split()
        if len(parts) != 3:
            raise ValueError(
                f"Invalid {scope} OKLCH for {var_name}: expected exactly 3 space-separated numbers 'L C H', "
                f"got {len(parts)} parts: '{value}'"
            )

        try:
            return float(parts[0]), float(parts[1]), float(parts[2])
        except Exception as exc:
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: non-numeric components in '{value}'") from exc

    def _validate_oklch_ranges(self, lightness: float, chroma: float, hue: float, var_name: str, scope: str) -> None:
        """Validate OKLCH component ranges."""
        if not (0.0 <= lightness <= 1.0):
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: L={lightness} out of range [0.0, 1.0]")
        if not (0.0 <= chroma <= 0.5):
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: C={chroma} out of range [0.0, 0.5]")
        if not (0.0 <= hue <= 360.0):
            raise ValueError(f"Invalid {scope} OKLCH for {var_name}: H={hue} out of range [0.0, 360.0]")

    async def _find_globals_css(self, project_id: int, session_id: str) -> Path | None:
        """
        Find the globals.css file in the session
        """
        # Always use session-specific path (including main as a session)
        project_path = FileSystemService().get_session_path(project_id, session_id)

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

    async def update_single_color(
        self, project_id: int, session_id: str, name: str, value: str, mode: str = "light"
    ) -> dict:
        """
        Update a single color variable in the session's CSS files
        """
        try:
            session_text = f", session {session_id}" if session_id else ""
            logger.info(f"🎨 Updating single color {name} for project {project_id}{session_text}")

            # Find and read globals.css
            globals_path = await self._find_globals_css(project_id, session_id=session_id)
            if not globals_path:
                return {"success": False, "message": "Could not find globals.css file in session"}

            css_content = await FileSystemService().read_file(str(globals_path))

            # Create a color variable object
            color_var = ColorVariable(
                name=name,
                light_value=value if mode == "light" else "",
                dark_value=value if mode == "dark" else "",
                scope=mode,
            )

            # Validate the color value
            self._validate_oklch(value, name, scope=mode)

            # Apply the single color update
            updated_css = await self._apply_single_color_to_css(css_content, color_var, mode)

            # Write updated CSS back to file
            await FileSystemService().update_file(str(globals_path), updated_css)

            logger.info(f"✅ Successfully updated color {name} in session {session_id}")

            return {
                "success": True,
                "message": f"Successfully updated color {name} with value {value} in {mode} mode",
                "mode": mode,
            }

        except Exception as error:
            logger.error(f"❌ Error updating single color: {error}")
            return {"success": False, "message": f"Failed to update color: {error!s}"}

    async def _apply_single_color_to_css(self, css_content: str, color: ColorVariable, mode: str) -> str:
        """
        Apply a single color variable update to CSS content
        """
        # Determine which block to update
        if mode == "light":
            # Update :root block
            pattern = r"(:root\s*{[^}]*)"
            replacement = self._update_color_in_block("\\1", color.name, f"oklch({color.light_value})")
        else:
            # Update .dark block
            pattern = r"(\.dark\s*{[^}]*)"
            replacement = self._update_color_in_block("\\1", color.name, f"oklch({color.dark_value})")

        # Apply the update
        updated_css = re.sub(pattern, replacement, css_content, flags=re.DOTALL)

        # If no match found, the variable doesn't exist in that block
        if updated_css == css_content:
            logger.warning(f"⚠️ Color variable {color.name} not found in {mode} block")

        return updated_css

    def _update_color_in_block(self, block_pattern: str, var_name: str, new_value: str):
        """
        Update a specific variable within a CSS block
        """

        def replace_var(match):
            block_content = match.group(1)
            var_pattern = rf"(\s*{re.escape(var_name)}\s*:\s*)([^;]+)(;)"

            def replace_value(var_match):
                return f"{var_match.group(1)}{new_value}{var_match.group(3)}"

            return re.sub(var_pattern, replace_value, block_content)

        return replace_var

    async def get_session_fonts(self, project_id: int, session_id: str) -> list[dict]:
        """
        Get font information from the session's layout files
        """
        try:
            # Get session path
            session_path = FileSystemService().get_session_path(project_id, session_id)

            # Look for layout.tsx file
            layout_path = session_path / "app" / "layout.tsx"

            if not layout_path.exists():
                # Try alternative paths
                alt_paths = [
                    session_path / "src" / "app" / "layout.tsx",
                    session_path / "pages" / "_app.tsx",
                    session_path / "app" / "layout.jsx",
                ]

                for alt_path in alt_paths:
                    if alt_path.exists():
                        layout_path = alt_path
                        break
                else:
                    return []

            # Read and parse layout file for font information
            layout_content = await FileSystemService().read_file(str(layout_path))
            return self._parse_fonts_from_layout(layout_content)

        except Exception as error:
            logger.error(f"❌ Error getting session fonts: {error}")
            return []

    def _parse_fonts_from_layout(self, layout_content: str) -> list[dict]:
        """
        Parse font information from layout file content
        """
        fonts = []

        # Look for Google Fonts imports with better filtering
        font_imports = re.findall(
            r'from\s+["\']next/font/google["\'].*?import\s+\{([^}]+)\}', layout_content, re.DOTALL
        )

        # Common font names to help filter out non-fonts
        known_font_patterns = [
            "geist",
            "inter",
            "roboto",
            "open_sans",
            "lato",
            "montserrat",
            "source_sans",
            "poppins",
            "nunito",
            "raleway",
            "ubuntu",
        ]

        for import_match in font_imports:
            font_names = [name.strip() for name in import_match.split(",")]
            for font_name in font_names:
                # Filter out obvious non-fonts (components, providers, etc.)
                if any(exclude in font_name.lower() for exclude in ["provider", "component", "theme", "clerk"]):
                    continue

                # Check if it looks like a font
                if any(pattern in font_name.lower() for pattern in known_font_patterns) or font_name.endswith("_Font"):
                    fonts.append(
                        {
                            "name": font_name,
                            "provider": "google",
                            "variable": font_name,
                            "config": {
                                "subsets": ["latin"],
                                "weights": [400, 500, 600, 700],
                                "display": "swap",
                            },
                            "usage": "body",
                        }
                    )

        # Look for font variable declarations (e.g., const geistSans = Geist(...))
        font_vars = re.findall(r"const\s+(\w+)\s*=\s*(\w+)\(", layout_content)
        for var_name, font_constructor in font_vars:
            # Only include if it looks like a font variable
            if any(term in var_name.lower() for term in ["font", "sans", "serif", "mono", "geist"]):
                provider = "google" if font_constructor not in ["system", "local"] else "local"
                fonts.append(
                    {
                        "name": var_name,
                        "provider": provider,
                        "variable": var_name,
                        "config": {
                            "subsets": ["latin"],
                            "weights": [400, 500, 600, 700],
                            "display": "swap",
                            "constructor": font_constructor,
                        },
                        "usage": "heading" if "heading" in var_name.lower() else "body",
                    }
                )

        return fonts
