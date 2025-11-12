import { hasAnalyticsConsent, posthog } from '@/lib/analytics/posthog';
import { useCallback } from 'react';

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Hook for tracking events with PostHog
 * Respects Cookiebot consent - events are only captured if user has given statistics consent
 * @returns Object with capture and identify methods
 */
export function usePostHog() {
  const capture = useCallback((eventName: string, properties?: EventProperties) => {
    if (!posthog || !hasAnalyticsConsent()) {
      return;
    }

    posthog.capture(eventName, properties);
  }, []);

  const identify = useCallback((userId: string, properties?: EventProperties) => {
    if (!posthog || !hasAnalyticsConsent()) {
      return;
    }

    posthog.identify(userId, properties);
  }, []);

  const reset = useCallback(() => {
    if (!posthog || !hasAnalyticsConsent()) {
      return;
    }

    posthog.reset();
  }, []);

  const featureEnabled = useCallback((featureFlagKey: string) => {
    if (!posthog || !hasAnalyticsConsent()) {
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
