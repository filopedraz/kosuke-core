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

# Override next.config.ts with optimized version for preview environments
if [ -f "/next.config.ts" ]; then
  echo "⚙️  Applying optimized Next.js configuration for preview..."
  cp /next.config.ts /app/next.config.ts
  echo "✅ Next.js configuration updated"
fi

# Install dependencies only if node_modules doesn't exist
if [ -d "node_modules" ]; then
  echo "📦 node_modules already exists, skipping installation"
else
  echo "📦 Installing dependencies..."
  INSTALL_START=$SECONDS
  bun install --silent
  INSTALL_TIME=$(( SECONDS - INSTALL_START ))
  echo "📦 Dependencies installed"
  echo "⏱️  [Entrypoint] bun install took ${INSTALL_TIME}s"
fi

# Create database if it doesn't exist
if [ -n "$POSTGRES_URL" ]; then
  echo "🗄️ Setting up database..."
  DB_SETUP_START=$SECONDS

  # Parse POSTGRES_URL to extract components
  # Format: postgres://user:pass@host:port/dbname
  DB_USER=$(echo "$POSTGRES_URL" | sed -n 's|^postgres://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$POSTGRES_URL" | sed -n 's|^postgres://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo "$POSTGRES_URL" | sed -n 's|^postgres://[^@]*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo "$POSTGRES_URL" | sed -n 's|^postgres://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
  DB_NAME=$(echo "$POSTGRES_URL" | sed -n 's|^postgres://[^/]*/\(.*\)$|\1|p')

  echo "📊 Database: $DB_NAME on $DB_HOST:$DB_PORT"

  # Create database if it doesn't exist (using psql via PGPASSWORD)
  export PGPASSWORD="$DB_PASS"

  # Check if database exists, create if not
  DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")

  if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ Database '$DB_NAME' already exists"
  else
    echo "🔨 Creating database '$DB_NAME'..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\"" 2>/dev/null || {
      echo "⚠️ Failed to create database. It may already exist or connection failed."
    }
    echo "✅ Database '$DB_NAME' created"
  fi

  unset PGPASSWORD

  DB_SETUP_TIME=$(( SECONDS - DB_SETUP_START ))
  echo "⏱️  [Entrypoint] Database setup took ${DB_SETUP_TIME}s"
fi

# Run database migrations/push schema
echo "🗄️ Pushing database schema..."
DB_PUSH_START=$SECONDS
bun run db:push
DB_PUSH_TIME=$(( SECONDS - DB_PUSH_START ))
echo "⏱️  [Entrypoint] db:push took ${DB_PUSH_TIME}s"

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

