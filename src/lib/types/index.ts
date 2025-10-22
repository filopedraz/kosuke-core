// Re-export all types from domain-specific files
export * from './agent';
export * from './auth';
export * from './branding';
export * from './chat';
export * from './chat-sessions';
export * from './database';
export * from './github';
export * from './infrastructure';
export * from './preview';
export * from './preview-urls';
export * from './project';

// Export user types explicitly to avoid UserProfile conflict
export type {
  BaseUser,
  DatabaseUser,
  DeleteAccountResponse,
  EnhancedUser,
  FormState,
  NotificationSettings,
  PipelinePreference,
  ProfileFormData,
  ProfileImageState,
  SecurityFormData,
  UpdateNotificationResponse,
  UpdateProfileResponse,
  UserPreferences,
  UserWithSubscription,
  UseUserReturn,
} from './user';

// Export the auth UserProfile as the primary one
export type { UserProfile } from './auth';

// Environment Variables
export type {
  CreateEnvironmentVariableData,
  CreateIntegrationData,
  EnvironmentVariable,
  EnvironmentVariableFromDB,
  Integration,
  IntegrationFromDB,
  IntegrationTemplate,
  UpdateEnvironmentVariableData,
  UpdateIntegrationData,
} from './environment';
