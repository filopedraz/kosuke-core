#!/bin/bash
set -e

echo "🚀 Starting Kosuke Agent..."

# Debug environment variables
echo "🔍 Environment check:"
echo "  CLAUDE_MODEL: ${CLAUDE_MODEL:-'not set'}"
echo "  MODEL_NAME: ${MODEL_NAME:-'not set'}"

# Configure Claude Code CLI model if CLAUDE_MODEL is set
if [ ! -z "$CLAUDE_MODEL" ]; then
    echo "🔧 Configuring Claude Code CLI model: $CLAUDE_MODEL"
    
    # First, check current model configuration
    echo "📋 Current Claude Code CLI configuration:"
    claude-code config --list || echo "  ⚠️ Could not list current config"
    
    # Set the model
    if claude-code config model "$CLAUDE_MODEL"; then
        echo "  ✅ Successfully set model to: $CLAUDE_MODEL"
    else
        echo "  ❌ Failed to set model, Claude Code CLI will use default"
        echo "  🔍 Checking available models..."
        claude-code config model --help || echo "  Could not get model help"
    fi
    
    # Verify the configuration
    echo "📋 Updated Claude Code CLI configuration:"
    claude-code config --list || echo "  ⚠️ Could not verify config"
else
    echo "⚠️ CLAUDE_MODEL environment variable not set, using Claude Code CLI default"
fi

# Start the main application
echo "🎯 Starting FastAPI application..."
exec "$@"
