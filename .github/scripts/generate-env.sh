#!/bin/bash

# ============================================================================
# Environment File Generator
# ============================================================================
# This script generates .env from .env.prod template and .secrets file
# Run on the server to create/update production .env file
# ============================================================================

set -e

# Get repository root (2 levels up from .github/scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_PROD_FILE="$REPO_ROOT/.env.prod"
SECRETS_FILE="$REPO_ROOT/.secrets"
ENV_OUTPUT_FILE="$REPO_ROOT/.env"
BACKUP_DIR="$REPO_ROOT/env_backups"

echo "🔧 Environment File Generator"
echo "=============================="
echo ""

# Check if .env.prod exists
if [ ! -f "$ENV_PROD_FILE" ]; then
  echo "❌ ERROR: .env.prod template file not found"
  echo "Expected location: $ENV_PROD_FILE"
  exit 1
fi

echo "✅ Found .env.prod template"

# Check if .secrets exists
if [ ! -f "$SECRETS_FILE" ]; then
  echo "❌ ERROR: .secrets file not found"
  echo "Expected location: $SECRETS_FILE"
  echo ""
  echo "Please create .secrets file with your production secrets."
  exit 1
fi

echo "✅ Found .secrets file"

# Backup existing .env if it exists
if [ -f "$ENV_OUTPUT_FILE" ]; then
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="$BACKUP_DIR/.env.backup_$TIMESTAMP"
  cp "$ENV_OUTPUT_FILE" "$BACKUP_FILE"
  echo "✅ Backed up existing .env to $BACKUP_FILE"
fi

echo ""
echo "🔐 Loading secrets..."

# Source the secrets file to export all variables
set -a
source "$SECRETS_FILE"
set +a

echo "✅ Loaded secrets from .secrets"

echo ""
echo "🔨 Generating .env file..."

# Use envsubst to replace variables in .env.prod
envsubst < "$ENV_PROD_FILE" > "$ENV_OUTPUT_FILE"

echo "✅ Generated .env file successfully"
echo ""
echo "📍 Location: $ENV_OUTPUT_FILE"
echo "🎉 Done!"

