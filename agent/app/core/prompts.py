"""
System prompts for the Kosuke Agent

Contains the base system prompt and functionality to build complete prompts with project context.
Mirrors the prompt structure from lib/llm/core/prompts.ts
"""

from app.services.fs_service import fs_service


def get_simplified_system_prompt() -> str:
    """
    Super lean system prompt for the Kosuke Agent
    """
    return """You are an expert TypeScript/React developer.

Help users modify their Next.js 15 project. Use the available file tools to read, edit, create files.

Rules:
- Read relevant files first to understand the codebase
- Actually implement changes, don't just plan
- Call `task_completed` with a summary when done
- Frontend code only (no APIs/database)
- No new dependencies

Tools: read_file, edit_file, create_file, delete_file, create_directory, remove_directory, task_completed"""


def build_simplified_system_prompt(project_id: int) -> str:
    """
    Build the simplified system prompt with project context

    Uses simplified prompt without JSON formatting requirements
    """
    base_prompt = get_simplified_system_prompt()
    project_context = _get_project_context(project_id)

    if project_context:
        return f"{base_prompt}\n\n{project_context}"
    return base_prompt


def build_complete_system_prompt(project_id: int) -> str:
    """
    Build the complete system prompt with base instructions and project context

    Merges the functionality of _get_base_system_prompt and _get_basic_context_sync
    """
    # Legacy function - use simplified prompt instead
    return build_simplified_system_prompt(project_id)


def _get_project_context(project_id: int) -> str:
    """
    Get basic project context with directory structure and file listing

    Extracted from the original _get_basic_context_sync method
    """
    try:
        project_path = fs_service.get_project_path(project_id)
        if not project_path.exists():
            return "Project directory not found."

        # Get directory structure (already synchronous)
        directory_structure = fs_service.get_project_files_sync(project_id)

        # Helper function to format directory structure as a tree
        def format_structure(nodes, prefix=""):
            lines = []
            for i, node in enumerate(nodes):
                is_last_item = i == len(nodes) - 1

                # Choose the right tree symbols
                current_prefix = prefix + ("└── " if is_last_item else "├── ")
                next_prefix = prefix + ("    " if is_last_item else "│   ")

                if node["type"] == "directory":
                    lines.append(f"{current_prefix}{node['name']}/")
                    if "children" in node and node["children"]:
                        lines.extend(format_structure(node["children"], next_prefix))
                else:
                    # For files, just show the name without the full path
                    lines.append(f"{current_prefix}{node['name']}")

            return lines

        structure_lines = format_structure(directory_structure)
        structure_text = "\n".join(structure_lines) if structure_lines else "No files found"

        return f"""
================================================================
Project Context
================================================================
Project ID: {project_id}
Project Path: {project_path}

Project Structure:
{structure_text}
================================================================
"""
    except Exception as e:
        print(f"Error getting project context: {e}")
        return "Error loading project context"
