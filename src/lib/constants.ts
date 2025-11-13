/**
 * Application-wide constants
 */

// File System
export const PROJECTS_DIR = process.env.PROJECTS_DIR || 'projects';

// Git Settings
export const SESSION_BRANCH_PREFIX = process.env.SESSION_BRANCH_PREFIX || 'kosuke/chat-';

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
