# 📋 Ticket 3: Setup Pre-commit Hooks & Code Quality

**Priority:** High  
**Estimated Effort:** 1.5 hours

## Description

Set up pre-commit hooks that run different quality checks for Python (agent) and TypeScript/JavaScript (Next.js) files, similar to the morpheus project structure.

## Files to Create/Update

```
.husky/pre-commit
package.json (update scripts)
agent/Makefile (optional)
```

## Implementation Details

**.husky/pre-commit** - Multi-language pre-commit hook:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check if we have Python files in the commit
python_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(py)$' | grep '^agent/' || true)

# Run Python checks if there are Python files in agent/
if [ -n "$python_files" ]; then
  echo "🐍 Running Python code quality checks for agent/..."

  # Check if we're in the agent directory
  if [ -d "./agent" ]; then
    cd agent

    # Check for virtual environment
    if [ -f "./.venv/bin/activate" ]; then
      source ./.venv/bin/activate

      echo "  → Running ruff linting..."
      ruff check .
      if [ $? -ne 0 ]; then
        echo "❌ Python linting failed. Please fix the errors before committing."
        cd ..
        exit 1
      fi

      echo "  → Running ruff formatting..."
      ruff format . --check
      if [ $? -ne 0 ]; then
        echo "❌ Python formatting check failed. Run 'ruff format .' to fix."
        cd ..
        exit 1
      fi

      echo "  → Running mypy type checking..."
      mypy app --ignore-missing-imports
      if [ $? -ne 0 ]; then
        echo "❌ Python type checking failed. Please fix the errors before committing."
        cd ..
        exit 1
      fi

      echo "  → Running bandit security checks..."
      bandit -r app -f json -q
      if [ $? -ne 0 ]; then
        echo "❌ Python security checks failed. Please fix the issues before committing."
        cd ..
        exit 1
      fi

      echo "  → Running pytest..."
      pytest tests/ -v --tb=short
      if [ $? -ne 0 ]; then
        echo "❌ Python tests failed. Please fix the failing tests before committing."
        cd ..
        exit 1
      fi

      deactivate
      cd ..
      echo "✅ Python checks passed!"
    else
      echo "⚠️  Python virtual environment not found at agent/.venv"
      echo "   Run: cd agent && python -m venv .venv && source .venv/bin/activate && pip install -e ."
      exit 1
    fi
  fi
fi

# Check if we have TypeScript/JavaScript files in the commit
js_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$' | grep -v '^agent/' || true)

# Run Node.js checks if there are JS/TS files
if [ -n "$js_files" ]; then
  echo "🌐 Running Next.js code quality checks..."

  # Run tests and store the exit code
  echo "🧪 Running tests..."
  npm test -- --passWithNoTests
  if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix the failing tests before committing."
    exit 1
  fi

  # Run linting and store the exit code
  echo "🔍 Running ESLint..."
  npm run lint
  if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix the errors before committing."
    exit 1
  fi

  # Run type checking
  echo "🏷️  Running TypeScript checks..."
  npx tsc --noEmit
  if [ $? -ne 0 ]; then
    echo "❌ TypeScript type checking failed. Please fix the errors before committing."
    exit 1
  fi

  # Run formatting check
  echo "💅 Checking Prettier formatting..."
  npm run format:check
  if [ $? -ne 0 ]; then
    echo "❌ Formatting check failed. Run 'npm run format' to fix."
    exit 1
  fi

  echo "✅ Next.js checks passed!"
fi

echo "✅ All pre-commit checks passed!"
```

**package.json** - Update scripts section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "type-check": "tsc --noEmit",
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "prepare": "husky install"
  }
}
```

## Acceptance Criteria

- [x] Pre-commit hooks configured for both Python and JS/TS
- [x] Python quality checks: ruff, mypy, bandit, pytest
- [x] Next.js quality checks: ESLint, TypeScript, Prettier, Jest
- [x] Hooks run appropriate checks based on changed file types
- [x] Development scripts available in package.json and Makefile
- [x] Clear error messages when checks fail
