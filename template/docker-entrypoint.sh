#!/bin/bash
set -e

# Start total timing using built-in SECONDS
TOTAL_START=$SECONDS

echo "📋 Project structure:"
ls -la | head -20

# 1. Check if the REPO_URL environment variable is set
if [ -z "${REPO_URL}" ]; then
  echo "Error: REPO_URL environment variable is not set."
  exit 1
fi

# 2. Pull the user's code into the /app directory
echo "Cloning project from ${REPO_URL}..."
git init -b main
git remote add origin ${REPO_URL}
git fetch origin
git checkout -f -t origin/main

if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "main" ]; then
  echo "Checking out branch ${SESSION_ID}..."
  git checkout -b ${SESSION_ID}
fi

# 3. Create database if it doesn't exist
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

# 4. Run database migrations/push schema
echo "🗄️ Pushing database schema..."
DB_PUSH_START=$SECONDS
bun run db:push
DB_PUSH_TIME=$(( SECONDS - DB_PUSH_START ))
echo "⏱️  [Entrypoint] db:push took ${DB_PUSH_TIME}s"

# Calculate total startup time
STARTUP_TIME=$(( SECONDS - TOTAL_START ))
echo "⏱️  [Entrypoint] Total startup preparation took ${STARTUP_TIME}s"

# 5. Starting Next.js dev server...
echo "🚀 Starting application..."
exec "$@"

