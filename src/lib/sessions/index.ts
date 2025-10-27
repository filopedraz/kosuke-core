/**
 * Session Management Exports
 * Provides centralized access to session management functionality
 */

import { SessionManager } from './session-manager';

// Create and export a singleton instance
export const sessionManager = new SessionManager();
