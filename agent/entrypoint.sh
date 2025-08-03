#!/bin/bash
set -e

# Configure Claude Code CLI model if CLAUDE_MODEL is set
if [ ! -z "$CLAUDE_MODEL" ]; then
    echo "🔧 Configuring Claude Code CLI model: $CLAUDE_MODEL"
    claude-code config model "$CLAUDE_MODEL" || echo "⚠️ Failed to set model, using default"
fi

# Start the main application
exec "$@"
