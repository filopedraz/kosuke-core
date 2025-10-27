/**
 * Centralized event tracking definitions for PostHog
 * Define all your analytics events here for type safety and consistency
 */

// User events
export const USER_EVENTS = {
  SIGNED_UP: 'user_signed_up',
  SIGNED_IN: 'user_signed_in',
  SIGNED_OUT: 'user_signed_out',
  PROFILE_UPDATED: 'user_profile_updated',
  SETTINGS_UPDATED: 'user_settings_updated',
} as const;

// Project events
export const PROJECT_EVENTS = {
  CREATED: 'project_created',
  DELETED: 'project_deleted',
  UPDATED: 'project_updated',
  VIEWED: 'project_viewed',
  DEPLOYED: 'project_deployed',
} as const;

// Subscription events
export const SUBSCRIPTION_EVENTS = {
  STARTED: 'subscription_started',
  CANCELLED: 'subscription_cancelled',
  UPGRADED: 'subscription_upgraded',
  DOWNGRADED: 'subscription_downgraded',
  RENEWED: 'subscription_renewed',
} as const;

// Feature events
export const FEATURE_EVENTS = {
  USED: 'feature_used',
  DISCOVERED: 'feature_discovered',
  COMPLETED: 'feature_completed',
} as const;

// Export all events
export const ANALYTICS_EVENTS = {
  ...USER_EVENTS,
  ...PROJECT_EVENTS,
  ...SUBSCRIPTION_EVENTS,
  ...FEATURE_EVENTS,
} as const;

// Type for all event names
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
