#!/usr/bin/env python3
"""
Kosuke Agent CLI - Interactive SDK for agent microservice

Provides terminal-based interface matching the UI functionality:
- Create/manage projects
- Interactive chat with streaming responses
- Pipeline selection (Kosuke vs Claude Code)
- File change tracking and diff display
- Project preview URLs

Usage:
    python main.py

Requirements:
    1. Agent service running on localhost:8001
       Start with: docker-compose up agent

    2. Install dependencies:
       pip install -r requirements.txt

Features:
    - Interactive menu-driven interface
    - Pipeline selection between Kosuke and Claude Code
    - Real-time streaming responses with rich formatting
    - Enhanced event logging for debugging
    - Automatic project management in ./projects/ directory
    - File change diff display with +/- line counts
    - Error handling with graceful fallbacks
    - Preview URL integration

Pipelines:
    - Claude Code: Advanced repository analysis using claude-code-sdk (default)
    - Kosuke: Traditional agentic workflow with standard tools

Example workflow:
    1. Run: python main.py
    2. Choose "5" to switch pipeline (optional)
    3. Choose "1" to create new project
    4. Chat with agent: "Create a todo list component"
    5. See streaming responses and detailed event logs
    6. Preview at http://localhost:3001
"""

import asyncio
import json
from collections.abc import AsyncGenerator
from pathlib import Path

import aiofiles
import httpx
from rich.console import Console
from rich.progress import Progress
from rich.progress import SpinnerColumn
from rich.progress import TextColumn
from rich.prompt import Prompt
from rich.table import Table


class KosukeAgentClient:
    """SDK for interacting with Kosuke Agent microservice"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.console = Console()
        self.projects_dir = Path("../projects")
        self.projects_dir.mkdir(exist_ok=True)
        self.current_pipeline = "claude-code"  # Default pipeline

    def set_pipeline(self, pipeline: str):
        """Set the current pipeline (kosuke or claude-code)"""
        if pipeline in ["kosuke", "claude-code"]:
            self.current_pipeline = pipeline
            self.console.print(f"🔄 Pipeline set to: {pipeline}")
        else:
            self.console.print(f"❌ Invalid pipeline: {pipeline}. Use 'kosuke' or 'claude-code'")

    async def health_check(self) -> bool:
        """Check if agent service is running"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/health", timeout=5.0)
                return response.status_code == 200
        except Exception:
            return False

    async def create_project(self) -> int | None:
        """Create a new project ID - agent will create files when prompted"""
        try:
            # Find next available project ID
            existing_projects = [int(p.name) for p in self.projects_dir.iterdir() if p.is_dir() and p.name.isdigit()]
            project_id = max(existing_projects, default=0) + 1

            # Just create empty project directory - agent will populate it
            project_path = self.projects_dir / str(project_id)
            project_path.mkdir(exist_ok=True)

            self.console.print(f"✅ Project created! ID: {project_id}")
            self.console.print(f"📁 Location: {project_path}")
            self.console.print("💡 Agent will create files when you start chatting")
            self.console.print("🌐 Preview: Use chat to start development server")

            return project_id
        except Exception as e:
            self.console.print(f"❌ Failed to create project: {e}")
            return None

    async def list_projects(self) -> list[int]:
        """List all available projects"""
        projects = []
        for project_dir in self.projects_dir.iterdir():
            if project_dir.is_dir() and project_dir.name.isdigit():
                projects.append(int(project_dir.name))
        return sorted(projects)

    async def delete_project(self, project_id: int) -> bool:
        """Delete a project"""
        try:
            project_path = self.projects_dir / str(project_id)
            if project_path.exists():
                import shutil

                shutil.rmtree(project_path)
                self.console.print(f"🗑️ Project {project_id} deleted")
                return True
            self.console.print(f"❌ Project {project_id} not found")
            return False
        except Exception as e:
            self.console.print(f"❌ Failed to delete project: {e}")
            return False

    async def chat_stream(self, project_id: int, prompt: str) -> AsyncGenerator[dict, None]:
        """Stream chat responses from agent using selected pipeline"""
        payload = {"project_id": project_id, "prompt": prompt, "chat_history": []}

        # Select endpoint based on current pipeline
        if self.current_pipeline == "claude-code":
            endpoint = f"{self.base_url}/api/claude-code/stream"
            self.console.print("🧠 [blue]Using Claude Code pipeline[/blue]")
        else:
            endpoint = f"{self.base_url}/api/chat/stream"
            self.console.print("🤖 [green]Using Kosuke pipeline[/green]")

        try:
            async with httpx.AsyncClient(timeout=300.0) as client, client.stream(
                "POST", endpoint, json=payload, headers={"Accept": "text/event-stream"}
            ) as response:
                if response.status_code != 200:
                    yield {"type": "error", "message": f"HTTP {response.status_code}: {response.text}"}
                    return

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            # Log event details for debugging
                            self._log_event(data)
                            yield data
                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            yield {"type": "error", "message": f"Connection error: {e}"}

    def _log_event(self, event: dict):
        """Log event details for debugging"""
        event_type = event.get("type", "unknown")

        if self.current_pipeline == "claude-code":
            self._log_claude_code_event(event_type, event)
        else:
            self._log_kosuke_event(event_type, event)

    def _log_claude_code_event(self, event_type: str, event: dict):
        """Log Claude Code specific events"""
        if event_type == "text":
            text_preview = event.get("text", "")[:50]
            message_id = event.get("message_id", "N/A")
            ellipsis = "..." if len(event.get("text", "")) > 50 else ""
            self.console.print(f"📝 [dim]Claude Code Text Event: {text_preview}{ellipsis} (msg: {message_id})[/dim]")
        elif event_type == "tool_start":
            tool_name = event.get("tool_name", "unknown")
            tool_id = event.get("tool_id", "N/A")
            tool_input = str(event.get("tool_input", {}))[:100]
            self.console.print(
                f"🔧 [dim]Claude Code Tool Start: {tool_name} (id: {tool_id}) - Input: {tool_input}[/dim]"
            )
        elif event_type in ["message", "message_chunk"]:
            message = event.get("message", "")[:100]
            ellipsis = "..." if len(event.get("message", "")) > 100 else ""
            event_icon = "💬" if event_type == "message" else "📩"
            self.console.print(f"{event_icon} [dim]Claude Code: {message}{ellipsis}[/dim]")
        elif event_type == "content_block_delta":
            delta = event.get("delta", {})
            text = delta.get("text", "")[:50]
            if text:
                ellipsis = "..." if len(delta.get("text", "")) > 50 else ""
                self.console.print(f"🔄 [dim]Claude Code Content Delta: {text}{ellipsis}[/dim]")
        elif event_type == "error":
            error_message = event.get("message", "Unknown error")
            self.console.print(f"❌ [red]Claude Code Error: {error_message}[/red]")
        elif event_type == "message_complete":
            self.console.print("✅ [dim]Claude Code Message Complete[/dim]")
        else:
            self.console.print(f"🔍 [dim]Claude Code Unknown Event: {event_type} - {str(event)[:100]}[/dim]")

    def _log_kosuke_event(self, event_type: str, event: dict):
        """Log Kosuke specific events"""
        if event_type in ["content_block_delta", "message_delta"]:
            text = event.get("delta", {}).get("text", "") or event.get("text", "")
            if text and len(text) > 0:
                text_preview = text[:30]
                ellipsis = "..." if len(text) > 30 else ""
                self.console.print(f"📝 [dim]Kosuke Text: {text_preview}{ellipsis}[/dim]")
        elif event_type == "tool_start":
            tool_name = event.get("tool_name", "unknown")
            self.console.print(f"🔧 [dim]Kosuke Tool: {tool_name}[/dim]")
        elif event_type == "error":
            error_message = event.get("message", "Unknown error")
            self.console.print(f"❌ [red]Kosuke Error: {error_message}[/red]")
        elif event_type in ["message_start", "message_complete", "message_stop"]:
            self.console.print(f"🎯 [dim]Kosuke Event: {event_type}[/dim]")

    async def get_project_files(self, project_id: int) -> dict[str, str]:
        """Get all files in project with their content"""
        project_path = self.projects_dir / str(project_id)
        files = {}

        if not project_path.exists():
            return files

        for file_path in project_path.rglob("*"):
            if file_path.is_file() and not any(part.startswith(".") for part in file_path.parts):
                try:
                    relative_path = file_path.relative_to(project_path)
                    async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                        files[str(relative_path)] = await f.read()
                except Exception:
                    # Skip binary files or files that can't be read
                    self.console.print(f"⚠️ Skipping unreadable file: {file_path}", style="dim")

        return files

    async def get_preview_status(self, project_id: int) -> dict | None:
        """Get preview status and URL from agent service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/preview/status/{project_id}", timeout=10.0)
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception:
            return None


class KosukeCLI:
    """Interactive CLI for Kosuke Agent"""

    def __init__(self):
        self.client = KosukeAgentClient()
        self.console = Console()

    async def run(self):
        """Main CLI loop"""
        if not await self._initialize_cli():
            return

        while True:
            try:
                choice = await self._show_main_menu()

                if not await self._handle_menu_choice(choice):
                    break  # User chose to exit

            except KeyboardInterrupt:
                self.console.print("\n👋 [yellow]Goodbye![/yellow]")
                break
            except Exception as e:
                self.console.print(f"❌ [red]Error: {e}[/red]")

    async def _initialize_cli(self) -> bool:
        """Initialize CLI and check service connection"""
        self.console.print("\n🤖 [bold blue]Kosuke Agent CLI[/bold blue]")
        self.console.print("=" * 20)

        # Check if service is running
        if not await self.client.health_check():
            self.console.print("❌ [red]Agent service not running at http://localhost:8001[/red]")
            self.console.print("💡 Start it with: [yellow]docker-compose up agent[/yellow]")
            return False

        self.console.print("✅ [green]Agent service connected[/green]\n")
        return True

    async def _handle_menu_choice(self, choice: str) -> bool:
        """Handle user menu choice. Returns False if user wants to exit."""
        menu_actions = {
            "1": self._create_new_project,
            "2": self._continue_existing_project,
            "3": self._list_projects,
            "4": self._delete_project,
            "5": self._switch_pipeline,
        }

        if choice == "6":
            self.console.print("👋 [yellow]Goodbye![/yellow]")
            return False

        if choice in menu_actions:
            await menu_actions[choice]()
            return True

        self.console.print("❌ [red]Invalid choice[/red]")
        return True

    async def _show_main_menu(self) -> str:
        """Display main menu and get user choice"""
        # Show current pipeline status
        pipeline_emoji = "🧠" if self.client.current_pipeline == "claude-code" else "🤖"
        pipeline_color = "blue" if self.client.current_pipeline == "claude-code" else "green"
        pipeline_title = self.client.current_pipeline.title()

        self.console.print(
            f"\n[bold]Current Pipeline:[/bold] {pipeline_emoji} [{pipeline_color}]{pipeline_title}[/{pipeline_color}]"
        )
        self.console.print("\n[bold]Choose an option:[/bold]")
        self.console.print("1. 📂 Create new project")
        self.console.print("2. 💬 Continue existing project")
        self.console.print("3. 📋 List projects")
        self.console.print("4. 🗑️  Delete project")
        self.console.print("5. 🔄 Switch pipeline")
        self.console.print("6. 🚪 Exit")

        return Prompt.ask("\nEnter choice", choices=["1", "2", "3", "4", "5", "6"])

    async def _create_new_project(self):
        """Create new project and start chat"""
        with Progress(
            SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=self.console
        ) as progress:
            task = progress.add_task("Creating new Next.js project...", total=None)
            project_id = await self.client.create_project()
            progress.remove_task(task)

        if project_id:
            await self._chat_interface(project_id)

    async def _continue_existing_project(self):
        """Continue with existing project"""
        projects = await self.client.list_projects()

        if not projects:
            self.console.print("❌ [red]No existing projects found[/red]")
            return

        self.console.print("\n[bold]Available projects:[/bold]")
        for project_id in projects:
            self.console.print(f"  {project_id}")

        try:
            project_id = int(Prompt.ask("Enter project ID"))
            if project_id in projects:
                await self._chat_interface(project_id)
            else:
                self.console.print("❌ [red]Invalid project ID[/red]")
        except ValueError:
            self.console.print("❌ [red]Invalid project ID[/red]")

    async def _list_projects(self):
        """List all projects"""
        projects = await self.client.list_projects()

        if not projects:
            self.console.print("📋 [yellow]No projects found[/yellow]")
            return

        table = Table(title="Projects")
        table.add_column("ID", style="cyan")
        table.add_column("Location", style="green")

        for project_id in projects:
            project_path = self.client.projects_dir / str(project_id)
            table.add_row(str(project_id), str(project_path))

        self.console.print(table)

    async def _delete_project(self):
        """Delete a project"""
        projects = await self.client.list_projects()

        if not projects:
            self.console.print("❌ [red]No projects found[/red]")
            return

        self.console.print("\n[bold]Available projects:[/bold]")
        for project_id in projects:
            self.console.print(f"  {project_id}")

        try:
            project_id = int(Prompt.ask("Enter project ID to delete"))
            if project_id in projects:
                confirm = Prompt.ask(f"Delete project {project_id}? (y/N)", default="n")
                if confirm.lower() == "y":
                    await self.client.delete_project(project_id)
            else:
                self.console.print("❌ [red]Invalid project ID[/red]")
        except ValueError:
            self.console.print("❌ [red]Invalid project ID[/red]")

    async def _switch_pipeline(self):
        """Switch between Kosuke and Claude Code pipelines"""
        current = self.client.current_pipeline

        self.console.print(f"\n[bold]Current pipeline:[/bold] {current}")
        self.console.print("\n[bold]Available pipelines:[/bold]")
        self.console.print("1. 🤖 Kosuke - Traditional agentic pipeline")
        self.console.print("2. 🧠 Claude Code - Advanced repository analysis with claude-code-sdk")

        choice = Prompt.ask("Select pipeline", choices=["1", "2"])

        if choice == "1":
            self.client.set_pipeline("kosuke")
        elif choice == "2":
            self.client.set_pipeline("claude-code")

        # Show pipeline differences
        if self.client.current_pipeline == "claude-code":
            self.console.print("\n[blue]Claude Code Pipeline Features:[/blue]")
            self.console.print("  • Advanced repository analysis")
            self.console.print("  • Intelligent file modification")
            self.console.print("  • Automatic tool execution (Read, Write, Bash, Grep)")
            self.console.print("  • Enhanced debugging with detailed event logs")
        else:
            self.console.print("\n[green]Kosuke Pipeline Features:[/green]")
            self.console.print("  • Traditional agentic workflow")
            self.console.print("  • Streaming responses")
            self.console.print("  • Standard tool integration")
            self.console.print("  • Project-aware development")

    async def _chat_interface(self, project_id: int):
        """Interactive chat interface"""
        pipeline_emoji = "🧠" if self.client.current_pipeline == "claude-code" else "🤖"
        pipeline_name = self.client.current_pipeline.title()
        pipeline_color = "blue" if self.client.current_pipeline == "claude-code" else "green"

        self.console.print(
            f"\n💬 [bold blue]Chat with {pipeline_emoji} {pipeline_name} Agent[/bold blue] (Project {project_id})"
        )
        self.console.print(f"[{pipeline_color}]Using {pipeline_name} pipeline[/{pipeline_color}]")

        # Show dynamic preview URL
        await self._show_preview_status(project_id)
        self.console.print("💡 [dim]Type 'exit' to return to main menu[/dim]\n")

        while True:
            try:
                prompt = Prompt.ask("[bold green]>[/bold green]", default="")

                if prompt.lower() in ["exit", "quit", "q"]:
                    break

                if not prompt.strip():
                    continue

                await self._handle_chat_response(project_id, prompt)

            except KeyboardInterrupt:
                self.console.print("\n💡 [yellow]Type 'exit' to return to main menu[/yellow]")
                continue

    def _get_message_emoji(self, event_type: str) -> str:
        """Get emoji for event type based on current pipeline"""
        if self.client.current_pipeline == "claude-code":
            # Claude Code specific events
            claude_code_emoji_map = {
                "text": "📝",
                "tool_start": "🔧",
                "message": "💬",
                "message_chunk": "📩",
                "content_block_delta": "🔄",
                "message_complete": "✅",
                "error": "❌",
            }
            return claude_code_emoji_map.get(event_type, "🔍")

        # Traditional Kosuke/Anthropic events
        kosuke_emoji_map = {
            "message_start": "🚀",
            "content_block_start": "📋",
            "content_block_delta": "💭",
            "content_block_stop": "⏸️",
            "message_delta": "📝",
            "message_stop": "🛑",
            "message_complete": "✅",
            "tool_start": "⚙️",
            "tool_complete": "✅",
            "tool_error": "❌",
            "error": "❌",
        }
        return kosuke_emoji_map.get(event_type, "📝")

    async def _handle_chat_response(self, project_id: int, prompt: str):  # noqa: C901, PLR0912, PLR0915
        """Handle streaming chat response for both Kosuke and Claude Code pipelines"""
        pipeline_name = self.client.current_pipeline.title()
        self.console.print(f"\n🤖 [bold blue]{pipeline_name} Agent Response:[/bold blue]")

        current_text = ""
        current_thinking = ""
        in_thinking_block = False

        async for event in self.client.chat_stream(project_id, prompt):
            if event.get("type") == "error":
                self.console.print(f"❌ [red]{event.get('message', 'Unknown error')}[/red]")
                break

            event_type = event.get("type", "unknown")
            emoji = self._get_message_emoji(event_type)

            # Handle Claude Code specific events
            if self.client.current_pipeline == "claude-code":
                if event_type == "text":
                    text = event.get("text", "")
                    if text:
                        current_text += text
                        self.console.print(text, end="")

                elif event_type == "tool_start":
                    tool_name = event.get("tool_name", "unknown")
                    tool_input = event.get("tool_input", {})
                    self.console.print(f"\n  🔧 [yellow]Claude Code Tool: {tool_name}[/yellow]")
                    if tool_input and len(str(tool_input)) < 200:
                        self.console.print(f"     [dim]Input: {tool_input!s}[/dim]")

                elif event_type == "message":
                    message = event.get("message", "")
                    if message:
                        self.console.print(f"\n  💬 [cyan]Claude Code: {message}[/cyan]")

                elif event_type == "message_chunk":
                    message = event.get("message", "")
                    if message:
                        self.console.print(f"\n  📩 [cyan]Chunk: {message}[/cyan]")

                elif event_type == "content_block_delta":
                    delta = event.get("delta", {})
                    text = delta.get("text", "")
                    if text:
                        current_text += text
                        self.console.print(text, end="")

                elif event_type == "message_complete":
                    self.console.print("\n  ✅ [green]Claude Code response completed![/green]")
                    break

            # Handle traditional Kosuke/Anthropic events
            elif event_type == "message_start":
                self.console.print(f"  {emoji} [bold]Starting response...[/bold]")

            elif event_type == "content_block_start":
                content_type = event.get("content_type", "")
                if content_type == "thinking":
                    in_thinking_block = True
                    self.console.print("\n  🧠 [bold blue]Thinking...[/bold blue]")
                elif content_type == "text":
                    in_thinking_block = False
                    self.console.print("\n  💬 [bold green]Response:[/bold green]")

            elif event_type == "content_block_delta":
                text = event.get("text", "")
                if text:
                    if in_thinking_block:
                        current_thinking += text
                        # Show thinking content in real-time (dimmed)
                        self.console.print(f"[dim]{text}[/dim]", end="")
                    else:
                        current_text += text
                        # Show response text in real-time
                        self.console.print(text, end="")

            elif event_type == "content_block_stop":
                if in_thinking_block:
                    self.console.print()  # New line after thinking
                else:
                    self.console.print()  # New line after text

            elif event_type == "tool_start":
                tool_name = event.get("tool_name", "unknown")
                self.console.print(f"\n  ⚙️ [yellow]Executing {tool_name}...[/yellow]")

            elif event_type == "tool_complete":
                tool_name = event.get("tool_name", "unknown")
                result = event.get("result", "")
                self.console.print(f"  ✅ [green]{tool_name} completed[/green]")
                if result and len(result) < 100:  # Show short results
                    self.console.print(f"     [dim]{result}[/dim]")

            elif event_type == "tool_error":
                tool_name = event.get("tool_name", "unknown")
                error = event.get("error", "")
                self.console.print(f"  ❌ [red]{tool_name} failed: {error}[/red]")

            elif event_type == "message_complete":
                self.console.print("\n  ✅ [green]Response completed![/green]")
                break

            elif event_type == "message_stop":
                self.console.print("\n  🛑 [yellow]Message stopped[/yellow]")

        # Show preview status after completion
        self.console.print()
        await self._show_preview_status(project_id)

    async def _show_preview_status(self, project_id: int):
        """Show current preview status and URL"""
        preview_status = await self.client.get_preview_status(project_id)

        if preview_status:
            if preview_status.get("running") and preview_status.get("url"):
                url = preview_status["url"]
                if preview_status.get("is_responding"):
                    self.console.print(
                        f"🌐 [bold green]Preview:[/bold green] [link]{url}[/link] [green]✓ Ready[/green]"
                    )
                else:
                    self.console.print(
                        f"🌐 [bold yellow]Preview:[/bold yellow] [link]{url}[/link] [yellow]⏳ Starting...[/yellow]"
                    )
            else:
                self.console.print("🌐 [dim]Preview: Not running (chat with agent to start)[/dim]")
        else:
            self.console.print("🌐 [dim]Preview: Status unavailable[/dim]")


async def main():
    """Main entry point"""
    cli = KosukeCLI()
    await cli.run()


if __name__ == "__main__":
    asyncio.run(main())
