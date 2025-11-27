FROM python:3.12-slim

# Create non-root user with same UID as kosuke-core image
RUN groupadd -g 1001 python && \
    useradd -m -u 1001 -g python -s /bin/bash python

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 1. Create the directories explicitly
# 2. Change ownership
# This ensures the "mount points" are owned by python (1001), not root.
RUN mkdir -p /app/.venv /app/__pycache__ && \
    chown -R python:python /app

# Switch to non-root user
USER python


ENV PATH="/app/.venv/bin:$PATH"

# Set entrypoint to install dependencies on container start
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command to run the application
CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
