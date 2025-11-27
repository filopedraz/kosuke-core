#!/bin/bash
set -e

# Check if pyproject.toml exists (should exist from GitHub template)
if [ ! -f "pyproject.toml" ]; then
  echo "❌ No pyproject.toml found. Ensure your project is have a pyproject.toml file."
  exit 1
fi

# 1. Create the virtual environment if it doesn't exist
if [ ! -f ".venv/pyvenv.cfg" ]; then
    echo "Creating virtual environment..."
    uv venv
fi

# 2. Install dependencies into the .venv
echo "Installing dependencies..."
uv pip install --no-cache -r pyproject.toml

# Execute the main command
exec "$@"

