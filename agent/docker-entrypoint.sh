#!/bin/bash
set -e

# Kosuke Preview Container Entrypoint
# This script handles git repository cloning and session setup

echo "🚀 Starting Kosuke Preview Container"
echo "📋 Project ID: ${PROJECT_ID:-unknown}"
echo "🌿 Session ID: ${SESSION_ID:-unknown}"

# Check if REPO_URL is provided
if [ -z "$REPO_URL" ]; then
    echo "⚠️  No REPO_URL provided - starting without git repository"
    echo "📂 Working directory: /app"
    cd /app
else
    echo "📦 Repository URL: $REPO_URL"
    echo "🌿 Session Branch: ${SESSION_BRANCH:-kosuke/session-unknown}"
    
    # Create workspace directory
    mkdir -p /app/workspace
    cd /app/workspace
    
    # Clone the repository
    echo "🔄 Cloning repository..."
    if [ -n "$GITHUB_TOKEN" ]; then
        # Use authenticated URL for private repositories
        AUTH_URL=$(echo "$REPO_URL" | sed "s|https://github.com/|https://oauth2:${GITHUB_TOKEN}@github.com/|")
        git clone "$AUTH_URL" .
    else
        # Use regular URL for public repositories
        git clone "$REPO_URL" .
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Repository cloned successfully"
    else
        echo "❌ Failed to clone repository"
        exit 1
    fi
    
    # Create and checkout session branch
    if [ -n "$SESSION_BRANCH" ]; then
        echo "🌿 Creating session branch: $SESSION_BRANCH"
        git checkout -b "$SESSION_BRANCH" 2>/dev/null || git checkout "$SESSION_BRANCH"
        if [ $? -eq 0 ]; then
            echo "✅ Session branch ready: $SESSION_BRANCH"
        else
            echo "⚠️  Using default branch"
        fi
    fi
    
    # Show repository status
    echo "📊 Repository Status:"
    echo "   Current branch: $(git branch --show-current)"
    echo "   Remote: $(git remote get-url origin)"
    echo "   Latest commit: $(git log -1 --oneline)"
    
    # Set working directory to cloned repo
    cd /app/workspace
fi

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "⚠️  Failed to install dependencies"
    fi
fi

# Start the development server
echo "🌐 Starting development server on port ${PORT:-3000}"
if [ -f "package.json" ]; then
    # Try different start commands in order of preference
    if npm run dev >/dev/null 2>&1; then
        echo "✅ Starting with 'npm run dev'"
        exec npm run dev
    elif npm start >/dev/null 2>&1; then
        echo "✅ Starting with 'npm start'"
        exec npm start
    else
        echo "⚠️  No dev/start script found, starting basic server"
        exec npx next dev
    fi
else
    echo "⚠️  No package.json found, starting basic web server"
    # Fallback: start a simple HTTP server
    exec python3 -m http.server ${PORT:-3000}
fi