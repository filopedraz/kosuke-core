/**
 * Application-wide constants
 */

// File System
export const PROJECTS_DIR = process.env.PROJECTS_DIR || 'projects';
export const UPLOADS_DIR = process.env.UPLOADS_DIR || 'public/uploads';

// Storage
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const STORAGE_BASE_URL = IS_PRODUCTION
  ? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://your-app.vercel.app'
  : 'http://localhost:3000';

// Digital Ocean Spaces Configuration
export const DO_SPACES_ENDPOINT = 'https://fra1.digitaloceanspaces.com';
export const DO_SPACES_REGION = 'fra1';
export const DO_SPACES_BUCKET = 'kosuke-core-prod';
export const DO_SPACES_CDN_URL = 'https://kosuke-core-prod.fra1.digitaloceanspaces.com';

// Agent Service
export const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';

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
