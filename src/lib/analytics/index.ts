/**
 * Analytics module - Centralized analytics utilities
 */

export {
  ANALYTICS_EVENTS,
  FEATURE_EVENTS,
  PROJECT_EVENTS,
  SUBSCRIPTION_EVENTS,
  USER_EVENTS,
} from './events';
export type { AnalyticsEvent } from './events';
export { initPostHog, posthog } from './posthog';
export { captureServerEvent, getPostHogClient, identifyServerUser } from './server';
