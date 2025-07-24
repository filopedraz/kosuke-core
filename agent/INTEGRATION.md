# Frontend Integration Guide

This document explains how the Next.js frontend integrates with the Python FastAPI agentic coding service.

## Architecture Overview

The integration maintains the existing Next.js API structure while proxying AI processing to the Python FastAPI microservice:

```
Frontend (React) → Next.js API Routes → Python FastAPI Service
                 ↓
              Database (PostgreSQL)
```

## API Endpoint Mapping

### Current Integration

| Next.js Endpoint                      | Purpose                                   | Python Service                      |
| ------------------------------------- | ----------------------------------------- | ----------------------------------- |
| `POST /api/projects/[id]/chat`        | Send message, save to DB, proxy to Python | `POST /api/chat/simple`             |
| `POST /api/projects/[id]/chat/stream` | Stream chat response                      | `POST /api/chat/stream`             |
| `GET /api/projects/[id]/chat/sse`     | Server-sent events for real-time updates  | Database polling + Python streaming |
| `GET /api/projects/[id]/chat`         | Get chat history                          | Database only                       |
| `GET /api/test-agent`                 | Test Python service connectivity          | Multiple Python endpoints           |

### Environment Variables

- `AGENT_SERVICE_URL`: URL of the Python FastAPI service (default: `http://localhost:8000`)

## Integration Details

### 1. Message Flow

1. **User sends message**: Frontend sends to `POST /api/projects/[id]/chat`
2. **Authentication & validation**: Next.js validates session and project access
3. **Database operations**: User message saved to PostgreSQL with token counting
4. **Python processing**: Request proxied to Python service `POST /api/chat/simple`
5. **Real-time updates**: SSE endpoint provides live updates via database polling

### 2. Streaming Chat

The new streaming endpoint `POST /api/projects/[id]/chat/stream` provides real-time streaming:

```typescript
// Frontend usage
const response = await fetch(`/api/projects/${projectId}/chat/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: userMessage }),
});

// Response is a Server-Sent Events stream
const eventSource = new EventSource(response.url);
```

### 3. Authentication & Authorization

All authentication and authorization remains in Next.js:

- Session validation
- Project ownership verification
- Rate limiting and subscription checks
- Database access control

The Python service operates as a stateless processing engine with no auth.

## Development Setup

### Docker Compose (Recommended)

```bash
# Start all services including Python agent
docker-compose up

# Next.js will be available at: http://localhost:3001
# Python service at: http://localhost:8000
# Database polling and proxy will work automatically
```

### Local Development

1. **Start Python service**:

   ```bash
   cd agent
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Set environment variable**:

   ```bash
   export AGENT_SERVICE_URL=http://localhost:8000
   ```

3. **Start Next.js**:
   ```bash
   npm run dev
   ```

## Testing the Integration

### Health Check

```bash
# Test Python service connectivity
curl http://localhost:3001/api/test-agent

# Expected response:
{
  "success": true,
  "message": "Python agent service is accessible",
  "agentServiceUrl": "http://localhost:8000",
  "health": { ... },
  "testChat": { ... }
}
```

### Chat Flow Test

```bash
# Test message proxying
curl -X POST http://localhost:3001/api/test-agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a simple React component"}'
```

### Frontend Test

1. Open http://localhost:3001
2. Log in and create/open a project
3. Send a message in the chat interface
4. Verify the message is processed by Python service
5. Check browser dev tools for SSE connection and updates

## Error Handling

The integration maintains the same error handling as the original TypeScript implementation:

- **Timeout errors**: `errorType: 'timeout'`
- **Parsing errors**: `errorType: 'parsing'`
- **Processing errors**: `errorType: 'processing'`
- **Unknown errors**: `errorType: 'unknown'`

Errors from the Python service are properly wrapped and forwarded to the frontend.

## Performance Considerations

- **Database operations**: Still handled by Next.js for consistency
- **File operations**: Proxied to Python service for processing
- **SSE connections**: Hybrid approach with database polling + Python streaming
- **Authentication**: Cached in Next.js, not repeated for each Python call

## Migration Benefits

1. **Seamless transition**: Existing frontend code works without changes
2. **Improved performance**: Python service handles AI processing more efficiently
3. **Better scaling**: AI processing can be scaled independently
4. **Maintained security**: All auth/authorization stays in Next.js
5. **Hybrid approach**: Database operations remain fast and consistent

## Troubleshooting

### Common Issues

1. **Connection refused**: Check `AGENT_SERVICE_URL` and Python service status
2. **Auth errors**: Verify Next.js session handling still works
3. **SSE timeout**: Check network configuration and Docker networking
4. **File operations fail**: Verify volume mounts in docker-compose.yml

### Debug Endpoints

- `GET /api/test-agent` - Test Python service connectivity
- `GET /api/health` - Next.js health
- `GET http://localhost:8000/api/health` - Python service health

### Logs

```bash
# Next.js logs
docker logs next_saas_starter_nextjs

# Python service logs
docker logs agentic_coding_pipeline

# Follow logs in real-time
docker-compose logs -f nextjs agent
```
