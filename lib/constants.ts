/**
 * Application-wide constants
 */

// File System
export const PROJECTS_DIR = process.env.PROJECTS_DIR || 'projects';

// LLM
export const LLM = {
  // Model configurations
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'claude-3-7-sonnet-20250219',
};

// Agent Service
export const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

// Billing-related constants have been removed
