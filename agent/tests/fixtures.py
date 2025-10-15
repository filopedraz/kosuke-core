"""Test fixtures and sample data for agent testing"""

import json
import tempfile
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock
from unittest.mock import MagicMock

import pytest

# Import actual models
from app.models.actions import Action
from app.models.actions import ActionType
from app.models.requests import ChatMessage
from app.models.requests import ChatRequest

# Sample project files
SAMPLE_PACKAGE_JSON = """{
  "name": "test-project",
  "version": "1.0.0",
  "description": "A test project for agent testing",
  "main": "src/index.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "react": "^18.0.0",
    "next": "^13.0.0"
  }
}"""

SAMPLE_REACT_COMPONENT = """import React from 'react';

export const Button = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      {children}
    </button>
  );
};

export default Button;"""

SAMPLE_NEXT_CONFIG = """/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig"""

SAMPLE_README = """# Test Project

This is a test project used for agent testing.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
"""

SAMPLE_INDEX_JS = """import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return (
    <div>
      <h1>Hello World</h1>
      <p>This is a test application.</p>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);"""


def create_sample_project_structure():
    """Return a dictionary representing a sample project structure"""
    return {
        "package.json": SAMPLE_PACKAGE_JSON,
        "next.config.js": SAMPLE_NEXT_CONFIG,
        "README.md": SAMPLE_README,
        "src/index.js": SAMPLE_INDEX_JS,
        "src/components/Button.tsx": SAMPLE_REACT_COMPONENT,
        "public/favicon.ico": "",  # Empty file
        ".gitignore": "node_modules/\n.next/\n.env.local\n",
    }


# Mock action objects using the actual Action model
def create_mock_action(
    action_type: ActionType, file_path: str, content: str = "", message: str = "Test action"
) -> Action:
    """Create a mock Action object with proper typing"""
    return Action(action=action_type, file_path=file_path, content=content, message=message)


# Mock LLM response structures - using plain dictionaries that can be JSON serialized
MOCK_LLM_RESPONSE = {
    "thinking": False,
    "actions": [
        {
            "action": "createFile",
            "filePath": "src/components/Button.tsx",
            "content": "export const Button = () => <button>Click me</button>;",
            "message": "Creating a simple button component",
        }
    ],
    "reasoning": "Creating a simple button component",
}

MOCK_COMPLEX_LLM_RESPONSE = {
    "thinking": False,
    "actions": [
        {
            "action": "createFile",
            "filePath": "src/components/Modal.tsx",
            "content": "export const Modal = ({ children, onClose }) => { /* modal implementation */ };",
            "message": "Creating modal component",
        },
        {
            "action": "editFile",
            "filePath": "src/index.js",
            "content": "console.log('updated test');",
            "message": "Updating index file",
        },
    ],
    "reasoning": "Creating a modal component and updating the index file",
}


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory with sample files"""
    with tempfile.TemporaryDirectory() as temp_dir:
        project_path = Path(temp_dir) / "test_project"
        project_path.mkdir()

        # Create project structure
        structure = create_sample_project_structure()

        for file_path, content in structure.items():
            full_path = project_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)

            if content:  # Only write non-empty content
                full_path.write_text(content)
            else:
                full_path.touch()  # Create empty file

        yield project_path


@pytest.fixture
def mock_llm_service():
    """Mock LLM service for testing"""
    mock_service = MagicMock()

    # Mock the generate_completion method to return JSON string
    mock_service.generate_completion = AsyncMock(return_value=json.dumps(MOCK_LLM_RESPONSE))

    # Mock other methods if they exist
    mock_service.count_tokens = MagicMock(return_value=150)

    return mock_service


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client for testing (for direct API calls)"""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock()]
    mock_response.content[0].text = json.dumps(MOCK_LLM_RESPONSE)
    mock_client.messages.create = AsyncMock(return_value=mock_response)
    return mock_client


@pytest.fixture
def mock_pydantic_ai_model():
    """Mock PydanticAI AnthropicModel"""
    return MagicMock()


def mock_anthropic_response(content: dict | None = None) -> Any:
    """Create a mock PydanticAI response"""
    mock_response = MagicMock()
    mock_response.data = json.dumps(content or MOCK_LLM_RESPONSE)
    return mock_response


@pytest.fixture
def sample_chat_request():
    """Sample chat request for testing"""
    return ChatRequest(project_id=123, prompt="Create a button component", chat_history=[])


@pytest.fixture
def sample_chat_message():
    """Sample chat message for testing"""
    return ChatMessage(role="user", content="Create a new React component")


@pytest.fixture
def mock_fs_service():
    """Mock file system service"""
    mock_service = MagicMock()
    mock_service.get_project_path = MagicMock(return_value=Path("/mock/project/123"))
    mock_service.file_exists = AsyncMock(return_value=True)
    mock_service.read_file = AsyncMock(return_value="mock file content")
    mock_service.create_file = AsyncMock()
    mock_service.update_file = AsyncMock()
    mock_service.delete_file = AsyncMock()
    mock_service.scan_directory = MagicMock(return_value={"files": []})
    return mock_service


@pytest.fixture
def mock_webhook_service():
    """Mock webhook service"""
    mock_service = MagicMock()
    mock_service.send_action_update = AsyncMock()
    mock_service.send_error = AsyncMock()
    return mock_service
