#!/bin/bash
set -e

# Environment variable defaults
DEV_MODE=${DEV_MODE:-true}

# Start total timing using built-in SECONDS
TOTAL_START=$SECONDS

echo "📦 Bun version: $(bun -v)"

# Check if package.json exists (should exist from GitHub template)
if [ ! -f "package.json" ]; then
  echo "❌ No package.json found. Project should be initialized via GitHub template."
  echo "🔗 Get started at: https://github.com/Kosuke-Org/kosuke-template"
  exit 1
fi

echo "📁 Working directory: $(pwd)"

# Install dependencies only if not skipped (non-default branches skip this)
if [ "$SKIP_INSTALL" = "true" ]; then
  echo "📦 Skipping dependency installation (using mounted node_modules)"
else
  echo "📦 Installing dependencies..."
  INSTALL_START=$SECONDS
  bun install --silent
  INSTALL_TIME=$(( SECONDS - INSTALL_START ))
  echo "📦 Dependencies installed"
  echo "⏱️  [Entrypoint] bun install took ${INSTALL_TIME}s"
fi

# Run database migrations/push schema
echo "🗄️ Setting up database schema..."
DB_START=$SECONDS
bun run db:push || {
  echo "⚠️ Database setup failed. Make sure PostgreSQL is running and accessible."
  echo "   You can start it with: docker compose up -d postgres"
}
DB_TIME=$(( SECONDS - DB_START ))
echo "⏱️  [Entrypoint] db:push took ${DB_TIME}s"

# Show project structure for debugging in dev mode
if [ "$DEV_MODE" = "true" ]; then
  echo "📋 Project structure:"
  ls -la | head -20
fi

# Set proper ownership for mounted volumes if specified
if [ -n "$PUID" ] && [ -n "$PGID" ]; then
  echo "👤 Setting file ownership to $PUID:$PGID..."
  chown -R $PUID:$PGID . 2>/dev/null || true
fi

# Calculate total startup time
STARTUP_TIME=$(( SECONDS - TOTAL_START ))
echo "⏱️  [Entrypoint] Total startup preparation took ${STARTUP_TIME}s"

# Execute the command passed to docker run
echo "🚀 Starting application..."
exec "$@"
