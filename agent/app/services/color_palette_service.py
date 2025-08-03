import json
import re
from pathlib import Path

from anthropic import AsyncAnthropic

from app.models.branding import ApplyPaletteResponse
from app.models.branding import ColorPaletteResponse
from app.models.branding import ColorVariable
from app.services.fs_service import fs_service
from app.utils.config import settings


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
            print(f"🎨 Generating color palette for project {project_id}")
            
            # Analyze project content
            project_content = await self._analyze_project_content(project_id)
            
            # Extract existing colors if not provided
            if existing_colors is None:
                existing_colors = await self._extract_existing_colors(project_id)

            print(f"📊 Found {len(existing_colors)} existing colors")
            print(f"🔍 Project content length: {len(project_content)} characters")

            # Generate colors using Claude
            generated_colors = await self._generate_colors_with_claude(
                project_id, project_content, keywords, existing_colors
            )

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
                projectContent=project_content[:200] + "..." if len(project_content) > 200 else project_content
            )

        except Exception as error:
            print(f"❌ Error generating color palette: {error}")
            return ColorPaletteResponse(
                success=False,
                message=f"Failed to generate color palette: {str(error)}",
                colors=[],
                applied=False
            )

    async def apply_color_palette(
        self, project_id: int, colors: list[ColorVariable]
    ) -> ApplyPaletteResponse:
        """
        Apply a color palette to the project's globals.css file
        """
        try:
            print(f"🎨 Applying {len(colors)} colors to project {project_id}")
            
            # Find and update globals.css
            globals_path = await self._find_globals_css(project_id)
            if not globals_path:
                return ApplyPaletteResponse(
                    success=False,
                    message="Could not find globals.css file in project",
                    appliedColors=0
                )

            # Read current CSS content
            css_content = await fs_service.read_file(str(globals_path))
            
            # Apply color variables to CSS
            updated_css = await self._apply_colors_to_css(css_content, colors)
            
            # Write updated CSS back to file
            await fs_service.update_file(str(globals_path), updated_css)
            
            print(f"✅ Successfully applied {len(colors)} colors to globals.css")
            
            return ApplyPaletteResponse(
                success=True,
                message=f"Successfully applied {len(colors)} colors to globals.css",
                appliedColors=len(colors)
            )

        except Exception as error:
            print(f"❌ Error applying color palette: {error}")
            return ApplyPaletteResponse(
                success=False,
                message=f"Failed to apply color palette: {str(error)}",
                appliedColors=0
            )

    async def _analyze_project_content(self, project_id: int) -> str:
        """
        Analyze project content to understand the theme and context
        """
        try:
            project_path = fs_service.get_project_path(project_id)
            
            # Look for main content files
            content_files = [
                "app/page.tsx",
                "app/page.jsx", 
                "app/layout.tsx",
                "app/layout.jsx",
                "pages/index.tsx",
                "pages/index.jsx",
                "README.md",
                "package.json"
            ]
            
            combined_content = []
            
            for file_path in content_files:
                full_path = project_path / file_path
                if full_path.exists():
                    try:
                        content = await fs_service.read_file(str(full_path))
                        # Limit content length to avoid huge prompts
                        if len(content) > 1000:
                            content = content[:1000] + "..."
                        combined_content.append(f"=== {file_path} ===\n{content}\n")
                    except Exception:
                        continue

            return "\n".join(combined_content)

        except Exception as error:
            print(f"⚠️ Error analyzing project content: {error}")
            return ""

    async def _extract_existing_colors(self, project_id: int) -> list[ColorVariable]:
        """
        Extract existing CSS color variables from globals.css
        """
        try:
            globals_path = await self._find_globals_css(project_id)
            if not globals_path:
                return []

            css_content = await fs_service.read_file(str(globals_path))
            
            colors = []
            
            # Extract variables from :root block
            root_match = re.search(r':root\s*{([^}]*)}', css_content, re.DOTALL)
            if root_match:
                root_vars = root_match.group(1)
                colors.extend(self._parse_css_variables(root_vars, "root"))
            
            # Extract variables from .dark block
            dark_match = re.search(r'\.dark\s*{([^}]*)}', css_content, re.DOTALL)
            if dark_match:
                dark_vars = dark_match.group(1)
                dark_colors = self._parse_css_variables(dark_vars, "dark")
                
                # Merge with existing root colors
                for dark_color in dark_colors:
                    existing_color = next((c for c in colors if c.name == dark_color.name), None)
                    if existing_color:
                        existing_color.darkValue = dark_color.lightValue
                    else:
                        colors.append(ColorVariable(
                            name=dark_color.name,
                            lightValue="",
                            darkValue=dark_color.lightValue,
                            scope="dark"
                        ))

            return colors

        except Exception as error:
            print(f"⚠️ Error extracting existing colors: {error}")
            return []

    def _parse_css_variables(self, css_block: str, scope: str) -> list[ColorVariable]:
        """
        Parse CSS variables from a CSS block
        """
        variables = []
        
        # Match CSS custom properties
        pattern = r'--([^:]+):\s*([^;]+);'
        matches = re.findall(pattern, css_block)
        
        for name, value in matches:
            # Clean up the values
            name = f"--{name.strip()}"
            value = value.strip()
            
            # Remove hsl() wrapper if present and keep only the values
            hsl_match = re.search(r'hsl\(([^)]+)\)', value)
            if hsl_match:
                value = hsl_match.group(1)
            
            variables.append(ColorVariable(
                name=name,
                lightValue=value,
                scope=scope
            ))
        
        return variables

    async def _generate_colors_with_claude(
        self,
        project_id: int,
        project_content: str,
        keywords: str,
        existing_colors: list[ColorVariable]
    ) -> list[ColorVariable]:
        """
        Use Claude to generate a color palette
        """
        # Prepare the prompt
        existing_colors_json = [
            {
                "name": color.name,
                "lightValue": color.lightValue,
                "darkValue": color.darkValue,
                "scope": color.scope
            }
            for color in existing_colors
        ]

        system_prompt = """You are an expert UI/UX designer and color specialist. Your task is to generate a cohesive, modern, and accessible color palette for both light and dark modes.

Follow these requirements:
1. CRITICAL: Return ALL existing color variables with their exact names - do not miss any!
2. IGNORE ALL EXISTING COLOR VALUES - only keep the variable names and generate entirely new color values
3. Ensure proper contrast ratios for accessibility (WCAG AA compliance)
4. Create a balanced palette with primary, secondary, and accent colors
5. Maintain semantic meaning of color variables (e.g., destructive should be red-based)
6. Format ALL output as a valid JSON array of color objects
7. All colors should be in HSL format as string like "220 100% 50%" (NOT hsl(220, 100%, 50%))
8. Return only the JSON array, no explanations or additional text
9. IMPORTANT: Your response MUST include ALL existing color variables without exception

Example output format:
[
  {
    "name": "--background",
    "lightValue": "0 0% 100%",
    "darkValue": "240 10% 3.9%",
    "scope": "root"
  },
  {
    "name": "--foreground", 
    "lightValue": "240 10% 3.9%",
    "darkValue": "0 0% 98%",
    "scope": "root"
  }
]"""

        user_prompt = f"""Generate a color palette for my website. Here are my existing color variables which MUST ALL be included in your response:
{json.dumps(existing_colors_json, indent=2)}

Project ID: {project_id}
{f'Project content summary (for context):{project_content[:500]}{"..." if len(project_content) > 500 else ""}' if project_content else ''}
{f'Keywords to influence the palette: {keywords}' if keywords else ''}

Create a cohesive, modern color palette{f' with influence from the provided keywords' if keywords else ''}. You MUST include ALL existing color variables in your response - do not miss any variables that were in the input list."""

        try:
            print("🤖 Calling Claude for color generation...")
            
            response = await self.client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=4000,
                temperature=0.5,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            response_text = response.content[0].text
            print(f"📝 Claude response length: {len(response_text)} characters")
            
            # Extract JSON from response
            json_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', response_text)
            if not json_match:
                raise ValueError("No valid JSON array found in Claude response")
            
            json_str = json_match.group(0)
            colors_data = json.loads(json_str)
            
            # Convert to ColorVariable objects
            colors = []
            for color_data in colors_data:
                colors.append(ColorVariable(
                    name=color_data["name"],
                    lightValue=color_data["lightValue"],
                    darkValue=color_data.get("darkValue"),
                    scope=color_data.get("scope", "root"),
                    description=color_data.get("description")
                ))
            
            print(f"✅ Successfully generated {len(colors)} colors")
            return colors

        except Exception as error:
            print(f"❌ Error calling Claude: {error}")
            raise error

    async def _find_globals_css(self, project_id: int) -> Path | None:
        """
        Find the globals.css file in the project
        """
        project_path = fs_service.get_project_path(project_id)
        
        # Common locations for globals.css
        possible_paths = [
            project_path / "app" / "globals.css",
            project_path / "src" / "globals.css", 
            project_path / "styles" / "globals.css",
            project_path / "app" / "global.css"
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
                root_colors.append(f"  {color.name}: {color.lightValue};")
            
            if color.darkValue and color.scope in ["root", "dark"]:
                dark_colors.append(f"  {color.name}: {color.darkValue};")
        
        # Create CSS blocks
        root_block = f":root {{\n{chr(10).join(root_colors)}\n}}"
        dark_block = f".dark {{\n{chr(10).join(dark_colors)}\n}}" if dark_colors else ""
        
        # Replace or add blocks
        css_content = self._replace_or_add_css_block(css_content, root_block, r':root\s*{[^}]*}')
        
        if dark_block:
            css_content = self._replace_or_add_css_block(css_content, dark_block, r'\.dark\s*{[^}]*}')
        
        return css_content

    def _replace_or_add_css_block(self, css_content: str, new_block: str, pattern: str) -> str:
        """
        Replace existing CSS block or add new one
        """
        if re.search(pattern, css_content):
            # Replace existing block
            return re.sub(pattern, new_block, css_content)
        else:
            # Add new block - find good insertion point
            import_end = -1
            for match in re.finditer(r'@import[^;]*;', css_content):
                import_end = match.end()
            
            if import_end > -1:
                # Insert after imports
                return css_content[:import_end] + f"\n\n{new_block}\n" + css_content[import_end:]
            else:
                # Insert at beginning
                return f"{new_block}\n\n{css_content}"


# Global instance
color_palette_service = ColorPaletteService()