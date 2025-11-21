#!/bin/sh
set -e

echo "📦 Bun version: $(bun -v)"

# Check if package.json exists (should exist from GitHub template)
if [ ! -f "package.json" ]; then
  echo "❌ No package.json found. Project should be initialized via GitHub template."
  echo "🔗 Get started at: https://github.com/Kosuke-Org/kosuke-template"
  exit 1
fi

echo "📁 Working directory: $(pwd)"

echo "📦 Installing dependencies..."
bun install --silent --frozen-lockfile
echo "📦 Dependencies installed"

# Run database migrations/push schema
echo "🗄️ Setting up database schema..."
bun run db:reset

# Execute the command passed to docker run
echo "🚀 Starting application..."
exec "$@" 