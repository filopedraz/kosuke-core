import { posthog } from '@/lib/analytics/posthog';
import { useCallback } from 'react';

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Hook for tracking events with PostHog
 * @returns Object with capture and identify methods
 */
export function usePostHog() {
  const capture = useCallback((eventName: string, properties?: EventProperties) => {
    if (!posthog) {
      console.warn('PostHog not initialized');
      return;
    }

    posthog.capture(eventName, properties);
  }, []);

  const identify = useCallback((userId: string, properties?: EventProperties) => {
    if (!posthog) {
      console.warn('PostHog not initialized');
      return;
    }

    posthog.identify(userId, properties);
  }, []);

  const reset = useCallback(() => {
    if (!posthog) {
      console.warn('PostHog not initialized');
      return;
    }

    posthog.reset();
  }, []);

  const featureEnabled = useCallback((featureFlagKey: string) => {
    if (!posthog) {
      console.warn('PostHog not initialized');
      return false;
    }

    return posthog.isFeatureEnabled(featureFlagKey);
  }, []);

  return {
    capture,
    identify,
    reset,
    featureEnabled,
    posthog,
  };
}
