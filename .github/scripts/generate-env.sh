#!/bin/bash

# ============================================================================
# Environment File Generator
# ============================================================================
# This script generates .env from environment template and .secrets file
# Usage: ./generate-env.sh [staging|production]
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

# Get environment from argument
if [ -z "$1" ]; then
  echo "❌ ERROR: Environment argument required"
  echo "Usage: $0 [staging|production]"
  exit 1
fi

ENVIRONMENT="$1"

# Determine template file based on environment
case "$ENVIRONMENT" in
  staging)
    ENV_TEMPLATE_FILE="$REPO_ROOT/.env.stage"
    echo "🎯 STAGING environment (.env.stage)"
    ;;
  production)
    ENV_TEMPLATE_FILE="$REPO_ROOT/.env.prod"
    echo "🎯 PRODUCTION environment (.env.prod)"
    ;;
  *)
    echo "❌ ERROR: Invalid environment '$ENVIRONMENT'"
    echo "Expected: staging or production"
    exit 1
    ;;
esac

# Check if template exists
if [ ! -f "$ENV_TEMPLATE_FILE" ]; then
  echo "❌ ERROR: Template file not found: $ENV_TEMPLATE_FILE"
  exit 1
fi

echo "✅ Found $ENV_TEMPLATE_FILE template"

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
echo ""
echo "📍 Location: $ENV_OUTPUT_FILE"
echo "🌍 Environment: $ENVIRONMENT"
echo "🎉 Done!"

