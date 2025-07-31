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

// Agent Service
export const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
