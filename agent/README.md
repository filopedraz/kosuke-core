# Kosuke Agent 🤖

A powerful Python-based agent service using Claude Code CLI and FastAPI for agentic coding workflows.

## Quick Start

### 1. Environment Setup

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

**Important**: Edit `.env` and set your `ANTHROPIC_API_KEY` and preferred `CLAUDE_MODEL`.

### 2. Start the Agent

```bash
# From the root directory
docker-compose up agent --build
```

The agent will be available at `http://localhost:8001`

## 🤖 Claude Model Configuration

### Understanding Model Settings

The agent uses **two separate model configurations**:

1. **`CLAUDE_MODEL`** - Controls the Claude Code CLI tool model
2. **`MODEL_NAME`** - Controls the Python Anthropic client model

**For consistent behavior, both should be set to the same model.**

### Common Issue: Wrong Model Being Used

If you see the agent using `claude-sonnet-4-20250514` instead of your configured model:

#### **Diagnosis**
```bash
# Check your environment file
cat agent/.env | grep CLAUDE_MODEL

# Check container environment
docker-compose exec agent env | grep CLAUDE

# Check Claude Code CLI configuration
docker-compose exec agent claude-code config --list
```

#### **Solution**
1. **Create/Update `.env` file**:
   ```bash
   # In agent/.env
   CLAUDE_MODEL=claude-3-7-sonnet-20250219
   MODEL_NAME=claude-3-7-sonnet-20250219
   ```

2. **Rebuild the container**:
   ```bash
   docker-compose down
   docker-compose up agent --build
   ```

3. **Verify the fix**:
   ```bash
   docker-compose logs agent | grep -E "(model|claude)"
   ```

### Supported Models

- `claude-3-7-sonnet-20250219` (Recommended)
- `claude-sonnet-4-20250514`
- `claude-3-5-sonnet@20240620`
- `claude-3-5-haiku@20241022`

## 🏗️ Architecture

```
agent/
├── app/                    # Main application package
│   ├── main.py            # FastAPI app with CORS and routing
│   ├── api/routes/        # API endpoint definitions
│   ├── core/              # Core agent logic and workflows
│   ├── models/            # Pydantic models for validation
│   ├── services/          # Business logic services
│   ├── tools/             # Agent tool implementations
│   └── utils/             # Utilities and configuration
├── tests/                 # Comprehensive test suite
├── requirements.txt       # Python dependencies
├── pyproject.toml        # Tool configuration
├── Dockerfile            # Container definition
└── .env                  # Environment configuration (create from .env.example)
```

## 🛠️ Development

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Anthropic API key

### Local Development

1. **Setup virtual environment**:
   ```bash
   cd agent
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and preferences
   ```

3. **Run locally**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Code Quality

```bash
# Format and lint
ruff format .
ruff check --fix .

# Type checking
mypy app/

# Security analysis
bandit -r app/

# Run tests
pytest --cov=app
```

### Docker Development

```bash
# Build and start
docker-compose up agent --build

# View logs
docker-compose logs -f agent

# Execute commands in container
docker-compose exec agent bash
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CLAUDE_MODEL` | Claude Code CLI model | `claude-3-7-sonnet-20250219` | No |
| `MODEL_NAME` | Python client model | `claude-3-7-sonnet-20250219` | No |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | **Yes** |
| `LOG_LEVEL` | Logging level | `INFO` | No |
| `MAX_ITERATIONS` | Max agent iterations | `25` | No |
| `PROJECTS_DIR` | Projects directory | `projects` | No |

### Agent Tools

Available tools for the Claude Code agent:

- **File Operations**: `Read`, `Write`, `Edit`, `MultiEdit`
- **System Commands**: `Bash`, `LS`, `Glob`, `Grep`
- **Workflow**: `Task`, `TodoWrite`, `ExitPlanMode`
- **Web**: `WebFetch`, `WebSearch`
- **Notebooks**: `NotebookRead`, `NotebookEdit`

## 🚀 API Endpoints

### Health Check
```bash
GET /api/health/simple
```

### Agentic Chat Stream
```bash
POST /api/agentic/stream
Content-Type: application/json

{
  "project_id": 1,
  "prompt": "Create a simple React component",
  "max_iterations": 25
}
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Run specific test file
pytest tests/test_health.py

# Verbose output
pytest -v
```

## 📊 Monitoring

### Logging

The agent provides structured logging with multiple levels:

```python
# In your code
import logging
logger = logging.getLogger(__name__)

logger.info("🎯 Starting task")
logger.debug("📝 Debug info")
logger.error("❌ Error occurred")
```

### Health Checks

Docker Compose includes health checks:

```yaml
healthcheck:
  test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/api/health/simple')"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## 🔍 Troubleshooting

### Common Issues

1. **Wrong Claude Model Used**
   - Check `.env` file exists and has correct `CLAUDE_MODEL`
   - Rebuild container: `docker-compose up agent --build`
   - Verify logs: `docker-compose logs agent`

2. **API Key Issues**
   - Verify `ANTHROPIC_API_KEY` in `.env`
   - Check API key permissions on Anthropic console

3. **Container Startup Fails**
   - Check Docker daemon is running
   - Verify port 8001 is available
   - Check logs: `docker-compose logs agent`

4. **File Permission Errors**
   - Ensure proper volume mounting in `docker-compose.yml`
   - Check host directory permissions

### Debug Commands

```bash
# Check container environment
docker-compose exec agent env

# Test API endpoint
curl http://localhost:8001/api/health/simple

# View real-time logs
docker-compose logs -f agent

# Check Claude Code CLI config
docker-compose exec agent claude-code config --list
```

## 🤝 Contributing

1. **Setup Development Environment**
2. **Make Changes**
3. **Run Tests**: `pytest`
4. **Check Code Quality**: `ruff format . && ruff check . && mypy app/`
5. **Test in Docker**: `docker-compose up agent --build`

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PydanticAI Documentation](https://ai.pydantic.dev/)
- [Claude Code CLI Documentation](https://github.com/anthropics/claude-code)
- [Anthropic API Documentation](https://docs.anthropic.com/)

---

**Need help?** Check the troubleshooting section above or review the logs for specific error messages.
