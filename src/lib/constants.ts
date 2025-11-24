/**
 * Application-wide constants
 */

// Context for file operations
export const CONTEXT = {
  EXCLUDE_DIRS: [
    '.next',
    'node_modules',
    '.git',
    'dist',
    'build',
    '__pycache__',
    'venv',
    '.venv',
    'coverage',
  ],
  EXCLUDE_FILES: ['.DS_Store', 'Thumbs.db', '*.log', '*.tmp', '*.temp'],
};
