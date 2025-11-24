#!/bin/bash

# ============================================================================
# Add Secret Variable to .secrets File
# ============================================================================
# This script adds or updates a variable in the .secrets file
# Usage: ./add-secret.sh VARIABLE_NAME VARIABLE_VALUE
# ============================================================================

set -e

# Check if correct number of arguments provided
if [ "$#" -ne 2 ]; then
  echo "❌ ERROR: Invalid number of arguments"
  echo "Usage: $0 VARIABLE_NAME VARIABLE_VALUE"
  exit 1
fi

VARIABLE_NAME="$1"
VARIABLE_VALUE="$2"

# Get repository root (2 levels up from .github/scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SECRETS_FILE="$REPO_ROOT/.secrets"
BACKUP_DIR="$REPO_ROOT/secrets_backups"

echo "🔐 Add Secret Variable"
echo "=============================="
echo ""

# Validate variable name
if ! [[ "$VARIABLE_NAME" =~ ^[A-Z_][A-Z0-9_]*$ ]]; then
  echo "❌ ERROR: Variable name must contain only uppercase letters, numbers, and underscores"
  echo "❌ ERROR: Variable name must start with a letter or underscore"
  exit 1
fi

echo "✅ Variable name is valid: $VARIABLE_NAME"

# Create secrets file if it doesn't exist
if [ ! -f "$SECRETS_FILE" ]; then
  echo "📝 Creating new .secrets file..."
  touch "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
  echo "✅ Created .secrets file"
fi

# Backup existing .secrets file
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/.secrets.backup_$TIMESTAMP"
cp "$SECRETS_FILE" "$BACKUP_FILE"
echo "✅ Backed up .secrets to $BACKUP_FILE"

echo ""

# Check if variable already exists
if grep -q "^${VARIABLE_NAME}=" "$SECRETS_FILE"; then
  echo "⚠️  Variable $VARIABLE_NAME already exists"
  echo "📝 Updating existing variable..."
  # Update existing variable (escape special characters in value for sed)
  ESCAPED_VALUE=$(printf '%s\n' "$VARIABLE_VALUE" | sed 's/[\/&]/\\&/g')
  sed -i.bak "s/^${VARIABLE_NAME}=.*/${VARIABLE_NAME}=${ESCAPED_VALUE}/" "$SECRETS_FILE"
  rm -f "${SECRETS_FILE}.bak"
else
  echo "📝 Adding new variable..."
  # Append new variable
  echo "${VARIABLE_NAME}=${VARIABLE_VALUE}" >> "$SECRETS_FILE"
fi

echo "✅ Variable added/updated successfully"
echo ""

# Show last 3 lines of secrets file (masked)
echo "📄 Last 3 lines of .secrets file (values masked):"
tail -n 3 "$SECRETS_FILE" | sed 's/=.*/=***MASKED***/g'

echo ""
echo "🎉 Done!"

