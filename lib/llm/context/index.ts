/**
 * Context Module
 *
 * This module handles project context gathering, analysis, and preparation
 * for LLM processing. It contains utilities for parsing project structure,
 * analyzing TypeScript code, and creating comprehensive context for AI.
 */

// Re-export context functionality
export {
  countTokens,
  extractMethodSignatures,
  getProjectContextWithDirectoryStructureAndAnalysis,
} from './projectContext';

// Re-export TypeScript analysis types and functions
export { analyzeTsWithMorph, type Relationship } from './tsAnalysis';
