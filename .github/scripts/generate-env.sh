#!/bin/bash

# ============================================================================
# Environment File Generator
# ============================================================================
# This script generates .env from environment template and .secrets file
# Auto-detects environment: .env.stage (staging) or .env.prod (production)
# ============================================================================

set -e

# Get repository root (2 levels up from .github/scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS_FILE="$REPO_ROOT/.secrets"
ENV_OUTPUT_FILE="$REPO_ROOT/.env"
BACKUP_DIR="$REPO_ROOT/env_backups"

echo "🔧 Environment File Generator"
echo "=============================="
echo ""

# Auto-detect environment template
ENV_STAGE_FILE="$REPO_ROOT/.env.stage"
ENV_PROD_FILE="$REPO_ROOT/.env.prod"

if [ -f "$ENV_STAGE_FILE" ]; then
  ENV_TEMPLATE_FILE="$ENV_STAGE_FILE"
  ENVIRONMENT="staging"
  echo "🎯 Detected STAGING environment (.env.stage)"
elif [ -f "$ENV_PROD_FILE" ]; then
  ENV_TEMPLATE_FILE="$ENV_PROD_FILE"
  ENVIRONMENT="production"
  echo "🎯 Detected PRODUCTION environment (.env.prod)"
else
  echo "❌ ERROR: No environment template file found"
  echo "Expected: .env.stage or .env.prod"
  echo "Location: $REPO_ROOT"
  exit 1
fi

echo "✅ Using template: $ENV_TEMPLATE_FILE"

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

# Use envsubst to replace variables in template
envsubst < "$ENV_TEMPLATE_FILE" > "$ENV_OUTPUT_FILE"

echo "✅ Generated .env file successfully"
echo "📍 Location: $ENV_OUTPUT_FILE"
echo "🌍 Environment: $ENVIRONMENT"
echo ""
echo "🎉 Done!"

