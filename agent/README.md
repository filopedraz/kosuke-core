# Agentic Coding Pipeline - Python Microservice

AI-powered code generation microservice built with FastAPI, PydanticAI, and Claude 3.5 Sonnet.

## Features

- 🤖 **Agentic Workflow**: Iterative thinking and execution phases
- 🔄 **Real-time Streaming**: Server-Sent Events for live updates
- 🛠️ **File Operations**: Read, create, edit, delete files and directories
- 🧠 **Context Analysis**: TypeScript project structure analysis
- 🚀 **FastAPI**: High-performance async web framework
- 🐳 **Docker**: Containerized with hot reload for development

## Setup

### 1. Environment Variables

Copy the config file and set your API key:

```bash
cp config.env .env
```

Edit `.env` and set your Anthropic API key:

```env
ANTHROPIC_API_KEY=your_actual_api_key_here
```

### 2. Development Setup

#### Using Docker (Recommended)

```bash
# Build and start the service
docker-compose up agent --build

# The service will be available at http://localhost:8000
```

#### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server with hot reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Health Check

```
GET /health
```

### Chat Streaming

```
POST /api/chat/stream
Content-Type: application/json

{
  "project_id": 1,
  "prompt": "Create a new React component",
  "chat_history": []
}
```

## Project Structure

```
agent/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── api/                 # API endpoints
│   ├── core/                # Core agent logic
│   ├── models/              # Pydantic models
│   ├── services/            # Business logic services
│   ├── tools/               # Agent tools
│   └── utils/               # Utilities
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker configuration
├── config.env              # Environment variables template
└── README.md               # This file
```

## Development

### Hot Reload

The Docker setup includes hot reload - any changes to Python files will automatically restart the server.

### Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app
```

## Integration

This microservice is designed to work with the main Next.js application. The Next.js app proxies chat requests to this service and handles database operations.

### Frontend Integration

The Next.js application should proxy requests to:

- `http://agent:8000/api/chat/stream` (when running in Docker)
- `http://localhost:8000/api/chat/stream` (when running locally)

## Configuration

All configuration is handled through environment variables:

- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude access
- `LOG_LEVEL`: Logging level (default: INFO)
- `MAX_ITERATIONS`: Maximum agent iterations (default: 25)
- `PROCESSING_TIMEOUT`: Request timeout in ms (default: 90000)
- `MAX_TOKENS`: Maximum tokens per request (default: 60000)
- `PROJECTS_DIR`: Directory where projects are stored (default: /app/projects)

## Architecture

The service follows a layered architecture:

1. **API Layer**: FastAPI endpoints with streaming support
2. **Core Layer**: Agent workflow and action execution
3. **Services Layer**: LLM integration, file system, context analysis
4. **Tools Layer**: Individual agent capabilities
5. **Models Layer**: Data validation and serialization

## Error Handling

The service maintains compatibility with the original TypeScript implementation:

- `timeout`: Request timeout errors
- `parsing`: JSON/response parsing errors
- `processing`: General processing errors
- `unknown`: Unexpected errors

All errors are streamed back to the client in real-time.
