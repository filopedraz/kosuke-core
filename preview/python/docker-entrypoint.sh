#!/bin/bash
set -e

# Check if pyproject.toml exists (should exist from GitHub template)
if [ ! -f "pyproject.toml" ]; then
  echo "❌ No pyproject.toml found. Ensure your project is have a pyproject.toml file."
  exit 1
fi

echo "Installing dependencies from pyproject.toml..."
uv pip install --system --no-cache -r pyproject.toml

# Execute the main command
exec "$@"

