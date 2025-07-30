#!/usr/bin/env python3
"""
Comprehensive test script for debugging the Kosuke Agent

This script provides a full debugging experience for testing the agent
with detailed logging, error handling, and interactive features.
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# Load environment variables from .env file in agent directory
try:
    from dotenv import load_dotenv

    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Loaded environment variables from {env_path}")
    else:
        print(f"⚠️ .env file not found at {env_path}")
except ImportError:
    print("⚠️ python-dotenv not installed. Install with: pip install python-dotenv")
    print("   Trying to use system environment variables...")

# Override PROJECTS_DIR for local development
os.environ["PROJECTS_DIR"] = str(Path(__file__).parent.parent / "projects")
print(f"🔧 Set PROJECTS_DIR to: {os.environ['PROJECTS_DIR']}")

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.agent import Agent
from app.utils.config import settings


class AgentDebugger:
    """Enhanced debugging interface for the Kosuke Agent"""

    def __init__(self, project_id: int = 92):
        self.project_id = project_id
        self.agent = None
        self.session_start = time.time()
        self.total_chunks = 0

    async def initialize_agent(self) -> bool:
        """Initialize the agent with proper error handling"""
        try:
            print(f"🔧 Initializing Agent for Project {self.project_id}")
            print(f"📍 Model: {settings.model_name}")
            print(f"🔑 API Key configured: {'✅' if settings.anthropic_api_key else '❌'}")
            print("-" * 60)

            self.agent = Agent(self.project_id)
            print("✅ Agent initialized successfully!")
            return True

        except Exception as e:
            print(f"❌ Failed to initialize agent: {e}")
            print(f"🔍 Error type: {type(e).__name__}")
            return False

    async def run_test_prompt(self, prompt: str, show_raw_output: bool = False) -> None:
        """Run a test prompt with simplified debugging output"""
        if not self.agent:
            print("❌ Agent not initialized. Call initialize_agent() first.")
            return

        print(f"\n{'='*80}")
        print(f"🤖 TESTING PROMPT: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
        print(f"{'='*80}")

        start_time = time.time()
        chunk_count = 0

        try:
            # Buffer for accumulating chunks
            output_buffer = ""

            async for text_chunk in self.agent.run(prompt):
                chunk_count += 1
                self.total_chunks += 1

                # Print the chunk in real-time
                print(text_chunk, end="", flush=True)
                output_buffer += text_chunk

                # Small delay for better readability
                await asyncio.sleep(0.01)

        except Exception as e:
            print(f"\n\n❌ ERROR during agent execution:")
            print(f"   Type: {type(e).__name__}")
            print(f"   Message: {e}")
            import traceback

            print(f"   Traceback: {traceback.format_exc()}")

        end_time = time.time()
        duration = end_time - start_time

        print(f"\n\n{'='*80}")
        print(f"📊 EXECUTION SUMMARY:")
        print(f"   Duration: {duration:.2f}s")
        print(f"   Chunks: {chunk_count}")
        print(f"   Avg chunks/sec: {chunk_count/duration:.1f}")
        print(f"{'='*80}\n")

    async def interactive_session(self) -> None:
        """Start an interactive debugging session"""
        print(
            f"""
🚀 KOSUKE AGENT INTERACTIVE DEBUGGER
{'='*50}
Project ID: {self.project_id}
Type 'help' for commands, 'quit' to exit
"""
        )

        if not await self.initialize_agent():
            return

        while True:
            try:
                user_input = input("\n🤖 Enter prompt (or command): ").strip()

                if not user_input:
                    continue

                if user_input.lower() in ["quit", "exit", "q"]:
                    break
                elif user_input.lower() == "help":
                    self._show_help()
                elif user_input.lower() == "status":
                    self._show_status()
                elif user_input.lower().startswith("test"):
                    await self._run_predefined_tests()
                else:
                    # Regular prompt
                    await self.run_test_prompt(user_input)

            except KeyboardInterrupt:
                print("\n\n👋 Interrupted by user. Goodbye!")
                break
            except EOFError:
                print("\n\n👋 End of input. Goodbye!")
                break

    def _show_help(self) -> None:
        """Show available commands"""
        print(
            """
📚 AVAILABLE COMMANDS:
  help     - Show this help message
  status   - Show current session status
  test     - Run predefined test scenarios
  quit/q   - Exit the debugger

💡 EXAMPLE PROMPTS:
  "Create a simple React component called Button.tsx"
  "Add a new API route for user authentication"
  "Fix any TypeScript errors in the project"
  "Analyze the project structure and suggest improvements"
"""
        )

    def _show_status(self) -> None:
        """Show current session status"""
        duration = time.time() - self.session_start
        print(
            f"""
📊 SESSION STATUS:
  Project ID: {self.project_id}
  Session Duration: {duration:.1f}s
  Total Chunks: {self.total_chunks}
  Agent Initialized: {'✅' if self.agent else '❌'}
  Model: {settings.model_name}
"""
        )

    async def _run_predefined_tests(self) -> None:
        """Run a set of predefined test scenarios"""
        tests = [
            "Analyze the current project structure and provide a summary",
            "Create a simple utility function to format dates",
            "Check if there are any TypeScript errors in the project",
        ]

        print(f"\n🧪 Running {len(tests)} predefined tests...\n")

        for i, test_prompt in enumerate(tests, 1):
            print(f"\n🔬 Test {i}/{len(tests)}: {test_prompt}")
            await self.run_test_prompt(test_prompt)

            if i < len(tests):
                input("Press Enter to continue to next test...")


async def main():
    """Main entry point for the debugger"""
    debugger = AgentDebugger(project_id=92)

    # Check if running in interactive mode or with arguments
    if len(sys.argv) > 1:
        # Command line mode - run the provided prompt
        prompt = " ".join(sys.argv[1:])
        print(f"🎯 Command line mode: Running prompt")

        if await debugger.initialize_agent():
            await debugger.run_test_prompt(prompt, show_raw_output=True)
    else:
        # Interactive mode
        await debugger.interactive_session()


if __name__ == "__main__":
    print("🤖 Kosuke Agent Debugger Starting...")
    asyncio.run(main())
