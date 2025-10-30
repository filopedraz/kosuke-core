// Re-export all types from domain-specific files
export * from './agent';
export * from './branding';
export * from './chat';
export * from './chat-sessions';
export * from './database';
export * from './docker';
export * from './github';
export * from './infrastructure';
export * from './preview';
export * from './preview-urls';
export * from './project';

// Export user types explicitly to avoid UserProfile conflict
export type {
  DatabaseUser,
  EnhancedUser,
  PipelinePreference,
  UpdateProfileResponse,
  UseUserReturn,
} from './user';

// Environment Variables
export type {
  CreateEnvironmentVariableData,
  EnvironmentVariable,
  UpdateEnvironmentVariableData,
} from './environment';
